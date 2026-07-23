import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { AppTrack } from '../types';

const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'wma'];

type MediaStoreTrack = {
  mediaId: number;
  path: string;
  title: string;
  artist: string;
  album: string;
  albumId: number;
  albumArtist: string;
  trackNumber: number;
  duration: number;
  isMusic: boolean;
  artwork: string;
};

const MediaScanner: { queryAudio(): Promise<MediaStoreTrack[]> } | undefined =
  NativeModules.MediaScanner;

export async function requestAudioPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdk = Platform.Version as number;
  const perm =
    sdk >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const res = await PermissionsAndroid.request(perm);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

// Voice memos, call recordings, notifications, etc. are not songs.
const EXCLUDED_PATH = /voice ?notes?|recordings?|\/call ?rec|\/notifications?\/|\/ringtones?\/|\/music\/musicapp\//i;

function fileTitle(path: string): string {
  const name = path.split('/').pop() ?? path;
  return name.replace(/\.[^/.]+$/, '');
}

async function scanViaMediaStore(): Promise<AppTrack[]> {
  const rows = await MediaScanner!.queryAudio();
  const tracks: AppTrack[] = [];
  for (const r of rows) {
    if (EXCLUDED_PATH.test(r.path)) continue;
    if (!r.isMusic && r.duration < 30) continue;

    const artwork = r.artwork || undefined;
    tracks.push({
      id: 'local:' + r.path,
      url: 'file://' + r.path,
      title: r.title || fileTitle(r.path),
      artist: r.artist || 'Local',
      artwork,
      duration: r.duration || undefined,
      source: 'local',
      albumId: r.albumId > 0 ? 'mslocal:' + r.albumId : undefined,
      album: r.album || undefined,
      albumArtist: r.albumArtist || undefined,
      albumCover: artwork,
      trackNumber: r.trackNumber > 0 ? r.trackNumber : undefined,
    });
  }
  return tracks;
}

function isAudio(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  return !!ext && AUDIO_EXT.includes(ext);
}

async function scanDir(dir: string, depth: number, acc: AppTrack[]): Promise<void> {
  if (depth < 0) return;
  let items;
  try {
    items = await RNFS.readDir(dir);
  } catch {
    return;
  }
  for (const item of items) {
    if (item.isFile() && isAudio(item.name)) {
      acc.push({
        id: 'local:' + item.path,
        url: 'file://' + item.path,
        title: item.name.replace(/\.[^/.]+$/, ''),
        artist: 'Local',
        source: 'local',
      });
    } else if (item.isDirectory() && !item.name.startsWith('.')) {
      await scanDir(item.path, depth - 1, acc);
    }
  }
}

// Fallback file-system scan used when the native MediaScanner module is absent.
async function scanViaFs(): Promise<AppTrack[]> {
  const acc: AppTrack[] = [];
  const ext = RNFS.ExternalStorageDirectoryPath;
  const roots = [`${ext}/Music`, `${ext}/Download`, RNFS.DownloadDirectoryPath];

  const visited = new Set<string>();
  for (const root of roots) {
    if (visited.has(root)) continue;
    visited.add(root);
    await scanDir(root, 3, acc);
  }
  return acc;
}

export async function scanLocalMusic(): Promise<AppTrack[]> {
  let tracks: AppTrack[] = [];
  if (MediaScanner) {
    try {
      tracks = await scanViaMediaStore();
    } catch {
      tracks = await scanViaFs();
    }
  } else {
    tracks = await scanViaFs();
  }

  const map = new Map<string, AppTrack>();
  for (const t of tracks) map.set(t.id, t);
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

const MUSICAPP_DIR = /\/music\/musicapp\//i;
const YT_ID_IN_NAME = /\[([A-Za-z0-9_-]{11})\]\.[^.]+$/;

/**
 * Lists audio files published under Music/MusicApp as youtube tracks. Lets the
 * app re-adopt its downloads after a reinstall even without a backup: the
 * youtube id is recovered from the "[id]" suffix in the file name.
 */
export async function scanDownloadedYoutube(): Promise<AppTrack[]> {
  if (!MediaScanner) return [];
  let rows: MediaStoreTrack[];
  try {
    rows = await MediaScanner.queryAudio();
  } catch {
    return [];
  }
  const tracks: AppTrack[] = [];
  for (const r of rows) {
    if (!MUSICAPP_DIR.test(r.path)) continue;
    const m = r.path.match(YT_ID_IN_NAME);
    const id = m ? 'youtube:' + m[1] : 'local:' + r.path;
    const artwork = r.artwork || undefined;
    tracks.push({
      id,
      url: 'file://' + r.path,
      title: r.title || fileTitle(r.path).replace(/\s*\[[A-Za-z0-9_-]{11}\]$/, ''),
      artist: r.artist || 'YouTube',
      artwork,
      duration: r.duration || undefined,
      source: 'youtube',
    });
  }
  return tracks;
}
