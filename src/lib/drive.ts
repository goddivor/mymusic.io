import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { accessToken, ensureDriveAccess } from './account';

const MediaSaver: { publishAudio(src: string, name: string): Promise<string> } | undefined =
  NativeModules.MediaSaver;

const YT_ID_IN_NAME = /\[([A-Za-z0-9_-]{11})\]\.[^.]+$/;

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FOLDER_NAME = 'MusicApp';
const LIBRARY_NAME = 'library.json';

export type DriveFile = { id: string; name: string; size?: number };

export type Progress = {
  phase: 'library' | 'audio' | 'done';
  done: number;
  total: number;
  name?: string;
};

export type SyncResult =
  | { kind: 'ok'; uploaded: number; skipped: number }
  | { kind: 'denied' }
  | { kind: 'offline' }
  | { kind: 'signed-out' };

async function auth(): Promise<Record<string, string> | null> {
  const token = await accessToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function findFolder(headers: Record<string, string>): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`,
  );
  const res = await fetch(`${API}/files?q=${q}&fields=files(id)&pageSize=1`, { headers });
  const json: any = await res.json();
  return json?.files?.[0]?.id ?? null;
}

async function createFolder(headers: Record<string, string>): Promise<string | null> {
  const res = await fetch(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  });
  const json: any = await res.json();
  return json?.id ?? null;
}

async function folderId(headers: Record<string, string>): Promise<string | null> {
  return (await findFolder(headers)) ?? (await createFolder(headers));
}

/** Lists what the folder already holds, so a resumed backup skips what is there. */
async function listFolder(
  headers: Record<string, string>,
  parent: string,
): Promise<Map<string, DriveFile>> {
  const found = new Map<string, DriveFile>();
  let pageToken: string | undefined;
  do {
    const q = encodeURIComponent(`'${parent}' in parents and trashed=false`);
    const page = pageToken ? `&pageToken=${pageToken}` : '';
    const res = await fetch(
      `${API}/files?q=${q}&fields=nextPageToken,files(id,name,size)&pageSize=1000${page}`,
      { headers },
    );
    const json: any = await res.json();
    for (const f of json?.files ?? []) {
      found.set(f.name, { id: f.id, name: f.name, size: Number(f.size) || undefined });
    }
    pageToken = json?.nextPageToken;
  } while (pageToken);
  return found;
}

/**
 * Uploads in two steps rather than one multipart request: React Native's
 * FormData produces multipart/form-data, which Drive rejects, and a resumable
 * session also survives a large audio file better than a single POST.
 */
async function upload(
  headers: Record<string, string>,
  parent: string,
  name: string,
  mime: string,
  body: string | Blob,
  existingId?: string,
): Promise<boolean> {
  const url = existingId
    ? `${UPLOAD}/files/${existingId}?uploadType=resumable`
    : `${UPLOAD}/files?uploadType=resumable`;
  const metadata = existingId ? { name } : { name, parents: [parent] };
  const start = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { ...headers, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(metadata),
  });
  const session = start.headers.get('Location') ?? start.headers.get('location');
  if (!session) return false;
  const put = await fetch(session, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body,
  });
  return put.ok;
}

async function fileBlob(uri: string): Promise<Blob | null> {
  try {
    const res = await fetch(uri);
    return await res.blob();
  } catch {
    return null;
  }
}

export type Uploadable = { id: string; uri: string; name: string };

/**
 * The file name the downloader already gave the track, "Title [videoId].ext".
 * Keeping it on Drive is what lets a restored file be recognised by the
 * library scanner on another phone, which reads the id out of the brackets.
 */
export function driveName(uri: string): string | null {
  const base = decodeURIComponent(uri.split('/').pop() ?? '');
  return YT_ID_IN_NAME.test(base) ? base : null;
}

function mimeOf(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'm4a' || ext === 'mp4') return 'audio/mp4';
  if (ext === 'webm') return 'audio/webm';
  if (ext === 'opus' || ext === 'ogg') return 'audio/ogg';
  return 'audio/mpeg';
}

/**
 * Puts the library snapshot and the audio files it names into the user's own
 * Drive. Files already there are left alone, so an interrupted backup resumes
 * where it stopped instead of sending everything again.
 */
export async function backupToDrive(
  snapshot: string,
  tracks: Uploadable[],
  onProgress: (p: Progress) => void,
): Promise<SyncResult> {
  if (!(await ensureDriveAccess())) return { kind: 'denied' };
  const headers = await auth();
  if (!headers) return { kind: 'signed-out' };

  try {
    const parent = await folderId(headers);
    if (!parent) return { kind: 'offline' };

    onProgress({ phase: 'library', done: 0, total: 1 });
    const existing = await listFolder(headers, parent);
    await upload(
      headers,
      parent,
      LIBRARY_NAME,
      'application/json',
      snapshot,
      existing.get(LIBRARY_NAME)?.id,
    );

    let uploaded = 0;
    let skipped = 0;
    const pending = tracks.filter(t => !existing.has(t.name));
    skipped = tracks.length - pending.length;

    for (const [i, track] of pending.entries()) {
      onProgress({ phase: 'audio', done: i, total: pending.length, name: track.name });
      const blob = await fileBlob(track.uri);
      if (!blob) continue;
      if (await upload(headers, parent, track.name, mimeOf(track.name), blob)) uploaded += 1;
    }

    onProgress({ phase: 'done', done: pending.length, total: pending.length });
    return { kind: 'ok', uploaded, skipped };
  } catch {
    return { kind: 'offline' };
  }
}

export type RestoreResult =
  | { kind: 'ok'; snapshot: string; restored: number; missing: number }
  | { kind: 'none' }
  | { kind: 'denied' }
  | { kind: 'offline' };

/**
 * Brings back the library and the audio it points to. Each track whose file is
 * absent on this phone is downloaded from Drive and published into
 * Music/MusicApp through the same MediaSaver path as a fresh download, and its
 * url in the snapshot is rewritten to where it now lives. A restore that
 * returned the list without the sound would restore nothing.
 */
export async function restoreFromDrive(onProgress: (p: Progress) => void): Promise<RestoreResult> {
  if (!(await ensureDriveAccess())) return { kind: 'denied' };
  const headers = await auth();
  if (!headers) return { kind: 'denied' };

  try {
    const parent = await findFolder(headers);
    if (!parent) return { kind: 'none' };
    const files = await listFolder(headers, parent);
    const entry = files.get(LIBRARY_NAME);
    if (!entry) return { kind: 'none' };

    onProgress({ phase: 'library', done: 0, total: 1 });
    const res = await fetch(`${API}/files/${entry.id}?alt=media`, { headers });
    const snapshot: any = JSON.parse(await res.text());

    const byId = new Map<string, DriveFile>();
    for (const f of files.values()) {
      const m = f.name.match(YT_ID_IN_NAME);
      if (m) byId.set(m[1], f);
    }

    const tracks: any[] = snapshot.youtubeTracks ?? [];
    const todo: any[] = [];
    for (const track of tracks) {
      const local = typeof track.url === 'string' ? track.url.replace(/^file:\/\//, '') : '';
      if (!local || !(await RNFS.exists(local).catch(() => false))) todo.push(track);
    }

    let restored = 0;
    let missing = 0;
    for (const [i, track] of todo.entries()) {
      onProgress({ phase: 'audio', done: i, total: todo.length, name: track.title });
      const file = byId.get(track.id);
      if (!file || !MediaSaver) {
        missing += 1;
        continue;
      }
      const tmp = `${RNFS.CachesDirectoryPath}/${file.id}.part`;
      const dl = await RNFS.downloadFile({
        fromUrl: `${API}/files/${file.id}?alt=media`,
        toFile: tmp,
        headers,
      }).promise;
      if (dl.statusCode >= 400) {
        missing += 1;
        continue;
      }
      try {
        const published = await MediaSaver.publishAudio(tmp, file.name);
        track.url = 'file://' + published;
        restored += 1;
      } catch {
        missing += 1;
      } finally {
        await RNFS.unlink(tmp).catch(() => {});
      }
    }

    onProgress({ phase: 'done', done: todo.length, total: todo.length });
    return { kind: 'ok', snapshot: JSON.stringify(snapshot), restored, missing };
  } catch {
    return { kind: 'offline' };
  }
}

export async function driveStatus(): Promise<{ files: number; hasLibrary: boolean } | null> {
  const headers = await auth();
  if (!headers) return null;
  try {
    const parent = await findFolder(headers);
    if (!parent) return { files: 0, hasLibrary: false };
    const files = await listFolder(headers, parent);
    return { files: files.size, hasLibrary: files.has(LIBRARY_NAME) };
  } catch {
    return null;
  }
}
