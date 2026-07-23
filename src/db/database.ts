import { open, type DB } from '@op-engineering/op-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTrack } from '../types';

export type Playlist = { id: string; name: string; trackIds: string[] };
export type Folder = { id: string; name: string; playlistIds: string[] };

export type LibrarySnapshot = {
  youtubeTracks: AppTrack[];
  likedIds: string[];
  playlists: Playlist[];
  folders: Folder[];
  recentIds: string[];
  playCounts: Record<string, number>;
};

let db: DB | null = null;

function conn(): DB {
  if (!db) db = open({ name: 'musicapp.db' });
  return db;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY, url TEXT, title TEXT, artist TEXT, artwork TEXT,
    duration REAL, source TEXT, albumId TEXT, album TEXT, albumArtist TEXT,
    albumCover TEXT, trackNumber INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT, position INTEGER)`,
  `CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id TEXT, track_id TEXT, position INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY, name TEXT, position INTEGER)`,
  `CREATE TABLE IF NOT EXISTS folder_playlists (
    folder_id TEXT, playlist_id TEXT, position INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS likes (track_id TEXT PRIMARY KEY, position INTEGER)`,
  `CREATE TABLE IF NOT EXISTS play_counts (track_id TEXT PRIMARY KEY, count INTEGER)`,
  `CREATE TABLE IF NOT EXISTS recents (track_id TEXT PRIMARY KEY, position INTEGER)`,
  `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)`,
];

function rowToTrack(r: any): AppTrack {
  return {
    id: r.id,
    url: r.url,
    title: r.title,
    artist: r.artist,
    artwork: r.artwork || undefined,
    duration: r.duration || undefined,
    source: (r.source as 'local' | 'youtube') || 'youtube',
    albumId: r.albumId || undefined,
    album: r.album || undefined,
    albumArtist: r.albumArtist || undefined,
    albumCover: r.albumCover || undefined,
    trackNumber: r.trackNumber || undefined,
  };
}

export async function initDatabase(): Promise<LibrarySnapshot> {
  const c = conn();
  for (const stmt of SCHEMA) c.executeSync(stmt);
  await migrateFromAsyncStorage();
  return loadSnapshot();
}

export function loadSnapshot(): LibrarySnapshot {
  const c = conn();
  const youtubeTracks = c
    .executeSync('SELECT * FROM tracks WHERE source = ?', ['youtube'])
    .rows.map(rowToTrack);

  const playlistRows = c.executeSync('SELECT * FROM playlists ORDER BY position').rows;
  const ptRows = c.executeSync('SELECT * FROM playlist_tracks ORDER BY position').rows;
  const playlists: Playlist[] = playlistRows.map((p: any) => ({
    id: p.id,
    name: p.name,
    trackIds: ptRows.filter((t: any) => t.playlist_id === p.id).map((t: any) => t.track_id),
  }));

  const folderRows = c.executeSync('SELECT * FROM folders ORDER BY position').rows;
  const fpRows = c.executeSync('SELECT * FROM folder_playlists ORDER BY position').rows;
  const folders: Folder[] = folderRows.map((f: any) => ({
    id: f.id,
    name: f.name,
    playlistIds: fpRows.filter((x: any) => x.folder_id === f.id).map((x: any) => x.playlist_id),
  }));

  const likedIds = c
    .executeSync('SELECT track_id FROM likes ORDER BY position')
    .rows.map((r: any) => r.track_id);
  const recentIds = c
    .executeSync('SELECT track_id FROM recents ORDER BY position')
    .rows.map((r: any) => r.track_id);
  const playCounts: Record<string, number> = {};
  for (const r of c.executeSync('SELECT track_id, count FROM play_counts').rows as any[]) {
    playCounts[r.track_id] = r.count;
  }

  return { youtubeTracks, likedIds, playlists, folders, recentIds, playCounts };
}

export function saveYoutubeTracks(tracks: AppTrack[]): void {
  const c = conn();
  c.executeSync('DELETE FROM tracks WHERE source = ?', ['youtube']);
  for (const t of tracks) {
    c.executeSync(
      `INSERT OR REPLACE INTO tracks
        (id, url, title, artist, artwork, duration, source, albumId, album, albumArtist, albumCover, trackNumber)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.url,
        t.title,
        t.artist,
        t.artwork ?? null,
        t.duration ?? null,
        'youtube',
        t.albumId ?? null,
        t.album ?? null,
        t.albumArtist ?? null,
        t.albumCover ?? null,
        t.trackNumber ?? null,
      ],
    );
  }
}

export function savePlaylists(playlists: Playlist[]): void {
  const c = conn();
  c.executeSync('DELETE FROM playlists');
  c.executeSync('DELETE FROM playlist_tracks');
  playlists.forEach((p, pi) => {
    c.executeSync('INSERT INTO playlists (id, name, position) VALUES (?, ?, ?)', [p.id, p.name, pi]);
    p.trackIds.forEach((tid, ti) => {
      c.executeSync(
        'INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)',
        [p.id, tid, ti],
      );
    });
  });
}

export function saveFolders(folders: Folder[]): void {
  const c = conn();
  c.executeSync('DELETE FROM folders');
  c.executeSync('DELETE FROM folder_playlists');
  folders.forEach((f, fi) => {
    c.executeSync('INSERT INTO folders (id, name, position) VALUES (?, ?, ?)', [f.id, f.name, fi]);
    f.playlistIds.forEach((pid, pi) => {
      c.executeSync(
        'INSERT INTO folder_playlists (folder_id, playlist_id, position) VALUES (?, ?, ?)',
        [f.id, pid, pi],
      );
    });
  });
}

export function saveLikes(ids: string[]): void {
  const c = conn();
  c.executeSync('DELETE FROM likes');
  ids.forEach((id, i) => c.executeSync('INSERT INTO likes (track_id, position) VALUES (?, ?)', [id, i]));
}

export function saveRecents(ids: string[]): void {
  const c = conn();
  c.executeSync('DELETE FROM recents');
  ids.forEach((id, i) => c.executeSync('INSERT INTO recents (track_id, position) VALUES (?, ?)', [id, i]));
}

export function savePlayCounts(counts: Record<string, number>): void {
  const c = conn();
  c.executeSync('DELETE FROM play_counts');
  for (const [id, n] of Object.entries(counts)) {
    c.executeSync('INSERT INTO play_counts (track_id, count) VALUES (?, ?)', [id, n]);
  }
}

async function migrateFromAsyncStorage(): Promise<void> {
  const c = conn();
  const done = c.executeSync('SELECT value FROM kv WHERE key = ?', ['migrated_v1']).rows[0];
  if (done) return;
  try {
    const [yt, likes, pls, recent, folders, counts] = await Promise.all([
      AsyncStorage.getItem('youtube_playlist'),
      AsyncStorage.getItem('liked_ids'),
      AsyncStorage.getItem('user_playlists'),
      AsyncStorage.getItem('recent_ids'),
      AsyncStorage.getItem('user_folders'),
      AsyncStorage.getItem('play_counts'),
    ]);
    const parse = <T>(raw: string | null, fb: T): T => {
      try {
        return raw ? JSON.parse(raw) : fb;
      } catch {
        return fb;
      }
    };
    saveYoutubeTracks(parse<AppTrack[]>(yt, []));
    saveLikes(parse<string[]>(likes, []));
    savePlaylists(parse<Playlist[]>(pls, []));
    saveFolders(parse<Folder[]>(folders, []));
    saveRecents(parse<string[]>(recent, []));
    savePlayCounts(parse<Record<string, number>>(counts, {}));
  } catch {}
  c.executeSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', ['migrated_v1', '1']);
}

export function exportSnapshot(): string {
  return JSON.stringify(loadSnapshot());
}

/** Replaces all library data with an imported snapshot (backup restore). */
export function importSnapshot(json: string): boolean {
  try {
    const s = JSON.parse(json) as LibrarySnapshot;
    saveYoutubeTracks(s.youtubeTracks ?? []);
    saveLikes(s.likedIds ?? []);
    savePlaylists(s.playlists ?? []);
    saveFolders(s.folders ?? []);
    saveRecents(s.recentIds ?? []);
    savePlayCounts(s.playCounts ?? {});
    return true;
  } catch {
    return false;
  }
}
