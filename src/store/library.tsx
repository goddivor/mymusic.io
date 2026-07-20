import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { requestAudioPermission, scanLocalMusic } from '../lib/scanMusic';
import {
  downloadYoutubeAudio,
  extractPlaylistId,
  extractYoutubeId,
  getPlaylist,
  isAlbumPlaylistId,
} from '../lib/ytExtractor';
import { AppTrack } from '../types';

const KEY_YT = 'youtube_playlist';
const KEY_LIKES = 'liked_ids';
const KEY_PLAYLISTS = 'user_playlists';
const KEY_RECENT = 'recent_ids';
const RECENT_MAX = 12;

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
};

export type DownloadStatus = 'extracting' | 'downloading' | 'done' | 'error';

export type Download = {
  id: string;
  title: string;
  artwork?: string;
  status: DownloadStatus;
  progress: number;
  error?: string;
};

export type DownloadMeta = {
  title?: string;
  albumId?: string;
  album?: string;
  albumArtist?: string;
  albumCover?: string;
  trackNumber?: number;
};

export type CollectionDownloadResult = {
  isAlbum: boolean;
  title: string;
  queued: number;
  total: number;
};

type LibraryState = {
  localTracks: AppTrack[];
  youtubeTracks: AppTrack[];
  likedIds: string[];
  playlists: Playlist[];
  scanning: boolean;
  permissionDenied: boolean;

  tracksById: Record<string, AppTrack>;
  likedTracks: AppTrack[];

  downloads: Download[];
  activeDownloadCount: number;
  startDownload: (url: string, meta?: DownloadMeta) => void;
  downloadCollection: (url: string) => Promise<CollectionDownloadResult>;
  clearFinishedDownloads: () => void;

  recentIds: string[];
  markPlayed: (id: string) => void;
  removeAlbum: (albumId: string) => void;

  rescanLocal: () => Promise<void>;
  isLiked: (id: string) => boolean;
  toggleLike: (track: AppTrack) => void;
  addYoutube: (track: AppTrack) => void;
  removeYoutube: (id: string) => void;
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  playlistTracks: (playlist: Playlist) => AppTrack[];
};

const LibraryContext = createContext<LibraryState | null>(null);

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return 'pl_' + Date.now().toString(36) + '_' + idCounter;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [localTracks, setLocalTracks] = useState<AppTrack[]>([]);
  const [youtubeTracks, setYoutubeTracks] = useState<AppTrack[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Load persisted state once.
  useEffect(() => {
    (async () => {
      const [yt, likes, pls, recent] = await Promise.all([
        AsyncStorage.getItem(KEY_YT),
        AsyncStorage.getItem(KEY_LIKES),
        AsyncStorage.getItem(KEY_PLAYLISTS),
        AsyncStorage.getItem(KEY_RECENT),
      ]);
      if (yt) setYoutubeTracks(safeParse(yt, []));
      if (likes) setLikedIds(safeParse(likes, []));
      if (pls) setPlaylists(safeParse(pls, []));
      if (recent) setRecentIds(safeParse(recent, []));
    })();
  }, []);

  const rescanLocal = useCallback(async () => {
    setScanning(true);
    const ok = await requestAudioPermission();
    if (!ok) {
      setPermissionDenied(true);
      setScanning(false);
      return;
    }
    setPermissionDenied(false);
    try {
      setLocalTracks(await scanLocalMusic());
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    rescanLocal();
  }, [rescanLocal]);

  const persistYt = useCallback((next: AppTrack[]) => {
    setYoutubeTracks(next);
    AsyncStorage.setItem(KEY_YT, JSON.stringify(next));
  }, []);
  const persistLikes = useCallback((next: string[]) => {
    setLikedIds(next);
    AsyncStorage.setItem(KEY_LIKES, JSON.stringify(next));
  }, []);
  const persistPlaylists = useCallback((next: Playlist[]) => {
    setPlaylists(next);
    AsyncStorage.setItem(KEY_PLAYLISTS, JSON.stringify(next));
  }, []);

  const addYoutube = useCallback(
    (track: AppTrack) => {
      setYoutubeTracks(prev => {
        if (prev.some(t => t.id === track.id)) return prev;
        const next = [track, ...prev];
        AsyncStorage.setItem(KEY_YT, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const removeYoutube = useCallback(
    (id: string) => {
      setYoutubeTracks(prev => {
        const next = prev.filter(t => t.id !== id);
        AsyncStorage.setItem(KEY_YT, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const patchDownload = useCallback((id: string, patch: Partial<Download>) => {
    setDownloads(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const startDownload = useCallback(
    (url: string, meta?: DownloadMeta) => {
      const id = extractYoutubeId(url);
      if (!id) return;

      let skip = false;
      setDownloads(prev => {
        // Skip if already running or finished successfully.
        const existing = prev.find(d => d.id === id);
        if (existing && existing.status !== 'error') {
          skip = true;
          return prev;
        }
        const entry: Download = {
          id,
          title: meta?.title ?? 'Préparation…',
          artwork: meta?.albumCover,
          status: 'extracting',
          progress: 0,
        };
        return [entry, ...prev.filter(d => d.id !== id)];
      });
      if (skip) return;

      // Fire-and-forget: runs in the background, multiple can run at once.
      downloadYoutubeAudio(
        url,
        pct => patchDownload(id, { status: 'downloading', progress: pct }),
        info =>
          patchDownload(id, {
            title: meta?.title ?? info.title,
            artwork: meta?.albumCover ?? info.thumbnail,
          }),
      )
        .then(track => {
          const merged: AppTrack = {
            ...track,
            albumId: meta?.albumId,
            album: meta?.album,
            albumArtist: meta?.albumArtist,
            albumCover: meta?.albumCover,
            trackNumber: meta?.trackNumber,
            artwork: track.artwork ?? meta?.albumCover,
          };
          addYoutube(merged);
          patchDownload(id, {
            status: 'done',
            progress: 1,
            title: merged.title,
            artwork: merged.artwork,
          });
        })
        .catch(e => {
          patchDownload(id, {
            status: 'error',
            error: e?.message ?? 'Échec du téléchargement',
          });
        });
    },
    [addYoutube, patchDownload],
  );

  const MAX_COLLECTION = 50;

  const downloadCollection = useCallback(
    async (url: string): Promise<CollectionDownloadResult> => {
      const pl = await getPlaylist(url);
      const listId = extractPlaylistId(url);
      const isAlbum = !!listId && isAlbumPlaylistId(listId);
      const items = pl.items.slice(0, MAX_COLLECTION);

      items.forEach((it, i) => {
        startDownload(it.url, {
          title: it.title,
          albumId: isAlbum ? listId ?? undefined : undefined,
          album: isAlbum ? pl.title : undefined,
          albumArtist: isAlbum ? pl.uploader : undefined,
          albumCover: isAlbum ? pl.thumbnail : undefined,
          trackNumber: isAlbum ? i + 1 : undefined,
        });
      });

      return {
        isAlbum,
        title: pl.title,
        queued: items.length,
        total: pl.items.length,
      };
    },
    [startDownload],
  );

  const clearFinishedDownloads = useCallback(() => {
    setDownloads(prev => prev.filter(d => d.status === 'extracting' || d.status === 'downloading'));
  }, []);

  const activeDownloadCount = downloads.filter(
    d => d.status === 'extracting' || d.status === 'downloading',
  ).length;

  const markPlayed = useCallback((id: string) => {
    setRecentIds(prev => {
      if (prev[0] === id) return prev;
      const next = [id, ...prev.filter(x => x !== id)].slice(0, RECENT_MAX);
      AsyncStorage.setItem(KEY_RECENT, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeAlbum = useCallback((albumId: string) => {
    setYoutubeTracks(prev => {
      const next = prev.filter(t => t.albumId !== albumId);
      AsyncStorage.setItem(KEY_YT, JSON.stringify(next));
      return next;
    });
  }, []);

  const tracksById = useMemo(() => {
    const map: Record<string, AppTrack> = {};
    for (const t of localTracks) map[t.id] = t;
    for (const t of youtubeTracks) map[t.id] = t;
    return map;
  }, [localTracks, youtubeTracks]);

  // Keep liked artwork/metadata snapshot so liked youtube tracks survive even if
  // not currently in a list. We store the full track for likes via tracksById,
  // falling back to a minimal record kept in a side map.
  const [likedSnapshots, setLikedSnapshots] = useState<Record<string, AppTrack>>({});
  useEffect(() => {
    const raw = likedSnapshots;
    let changed = false;
    const next = { ...raw };
    for (const id of likedIds) {
      if (tracksById[id] && !next[id]) {
        next[id] = tracksById[id];
        changed = true;
      }
    }
    if (changed) setLikedSnapshots(next);
  }, [likedIds, tracksById, likedSnapshots]);

  const likedTracks = useMemo(
    () =>
      likedIds
        .map(id => tracksById[id] || likedSnapshots[id])
        .filter(Boolean) as AppTrack[],
    [likedIds, tracksById, likedSnapshots],
  );

  const isLiked = useCallback((id: string) => likedIds.includes(id), [likedIds]);

  const toggleLike = useCallback(
    (track: AppTrack) => {
      setLikedSnapshots(prev => ({ ...prev, [track.id]: track }));
      setLikedIds(prev => {
        const next = prev.includes(track.id)
          ? prev.filter(x => x !== track.id)
          : [track.id, ...prev];
        AsyncStorage.setItem(KEY_LIKES, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const createPlaylist = useCallback(
    (name: string) => {
      const id = makeId();
      setPlaylists(prev => {
        const next = [...prev, { id, name: name.trim() || 'Playlist', trackIds: [] }];
        AsyncStorage.setItem(KEY_PLAYLISTS, JSON.stringify(next));
        return next;
      });
      return id;
    },
    [],
  );

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => {
      const next = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(KEY_PLAYLISTS, JSON.stringify(next));
      return next;
    });
  }, []);

  const addToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists(prev => {
      const next = prev.map(p =>
        p.id === playlistId && !p.trackIds.includes(trackId)
          ? { ...p, trackIds: [...p.trackIds, trackId] }
          : p,
      );
      AsyncStorage.setItem(KEY_PLAYLISTS, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      setPlaylists(prev => {
        const next = prev.map(p =>
          p.id === playlistId
            ? { ...p, trackIds: p.trackIds.filter(t => t !== trackId) }
            : p,
        );
        AsyncStorage.setItem(KEY_PLAYLISTS, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const playlistTracks = useCallback(
    (playlist: Playlist) =>
      playlist.trackIds
        .map(id => tracksById[id] || likedSnapshots[id])
        .filter(Boolean) as AppTrack[],
    [tracksById, likedSnapshots],
  );

  const value: LibraryState = {
    localTracks,
    youtubeTracks,
    likedIds,
    playlists,
    scanning,
    permissionDenied,
    downloads,
    activeDownloadCount,
    startDownload,
    downloadCollection,
    clearFinishedDownloads,
    recentIds,
    markPlayed,
    removeAlbum,
    tracksById,
    likedTracks,
    rescanLocal,
    isLiked,
    toggleLike,
    addYoutube,
    removeYoutube,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    playlistTracks,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryState {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
