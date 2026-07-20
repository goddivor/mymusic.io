import { NativeModules } from 'react-native';
import { AppTrack } from '../types';

type WebServerNative = {
  start(): Promise<{ ip: string; port: number; pin: string }>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
  status(): Promise<{
    running: boolean;
    ip: string;
    port: number;
    pin: string | null;
  }>;
  updateLibrary(json: string): void;
};

const Native: WebServerNative | undefined = NativeModules.WebServer;

export const WebServer = {
  start: () => Native!.start(),
  stop: () => Native!.stop(),
  isRunning: () => (Native ? Native.isRunning() : Promise.resolve(false)),
  status: () =>
    Native
      ? Native.status()
      : Promise.resolve({ running: false, ip: '', port: 8080, pin: null }),
  updateLibrary: (json: string) => Native?.updateLibrary(json),
  available: !!Native,
};

type Snapshot = {
  tracks: (AppTrack & { path: string })[];
  playlists: { id: string; name: string; trackIds: string[] }[];
  likedIds: string[];
};

type LibLike = {
  youtubeTracks: AppTrack[];
  localTracks: AppTrack[];
  playlists: { id: string; name: string; trackIds: string[] }[];
  likedIds: string[];
};

/**
 * Serialize the library into the snapshot the native server serves at /library.
 * `url` (a file:// path) is sent as `path`; the server streams that file.
 */
export function buildSnapshot(lib: LibLike): string {
  const all = [...lib.youtubeTracks, ...lib.localTracks];
  const tracks = all.map(t => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    albumId: t.albumId,
    albumArtist: t.albumArtist,
    albumCover: t.albumCover,
    trackNumber: t.trackNumber,
    artwork: t.artwork,
    duration: t.duration,
    source: t.source,
    path: t.url,
  }));
  const snap: Snapshot = {
    tracks: tracks as any,
    playlists: lib.playlists.map(p => ({
      id: p.id,
      name: p.name,
      trackIds: p.trackIds,
    })),
    likedIds: lib.likedIds,
  };
  return JSON.stringify(snap);
}
