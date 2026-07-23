import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  Folder,
  initDatabase,
  loadSnapshot,
  Playlist,
  saveFolders,
  saveLikes,
  savePlayCounts,
  savePlaylists,
  saveRecents,
  saveYoutubeTracks,
} from '../db/database';
import { t } from '../i18n';
import {
  requestAudioPermission,
  scanDownloadedYoutube,
  scanLocalMusic,
} from '../lib/scanMusic';
import {
  deleteDownloadedFile,
  downloadYoutubeAudio,
  migrateLegacyDownload,
  extractPlaylistId,
  extractYoutubeId,
  getPlaylist,
  isAlbumPlaylistId,
} from '../lib/ytExtractor';
import { AppTrack } from '../types';

export type { Folder, Playlist } from '../db/database';

const RECENT_MAX = 12;
const MAX_PARALLEL_DOWNLOADS = 2;
const MAX_DOWNLOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2500;

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
  playlistId?: string;
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
  folders: Folder[];
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
  playCounts: Record<string, number>;
  markPlayed: (id: string) => void;
  removeAlbum: (albumId: string) => void;

  rescanLocal: () => Promise<void>;
  isLiked: (id: string) => boolean;
  toggleLike: (track: AppTrack) => void;
  addYoutube: (track: AppTrack) => void;
  removeYoutube: (id: string) => void;
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  createFolder: (name: string) => string;
  deleteFolder: (id: string) => void;
  addPlaylistToFolder: (folderId: string, playlistId: string) => void;
  removePlaylistFromFolder: (playlistId: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  playlistTracks: (playlist: Playlist) => AppTrack[];
  reloadLibrary: () => void;
};

const LibraryContext = createContext<LibraryState | null>(null);

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return 'pl_' + Date.now().toString(36) + '_' + idCounter;
}


/** Moves downloads left in private storage by older versions to public storage. */
async function migrateLegacyTracks(tracks: AppTrack[]): Promise<AppTrack[] | null> {
  const updated: AppTrack[] = [];
  let changed = false;
  for (const track of tracks) {
    const moved = await migrateLegacyDownload(track.url, track.title);
    if (moved) {
      changed = true;
      updated.push({ ...track, url: moved });
    } else {
      updated.push(track);
    }
  }
  return changed ? updated : null;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [localTracks, setLocalTracks] = useState<AppTrack[]>([]);
  const [youtubeTracks, setYoutubeTracks] = useState<AppTrack[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const ytRef = useRef<AppTrack[]>([]);
  ytRef.current = youtubeTracks;
  const queueRef = useRef<{ url: string; meta?: DownloadMeta; attempts: number }[]>([]);
  const activeRef = useRef(0);

  useEffect(() => {
    (async () => {
      const snap = await initDatabase();
      setYoutubeTracks(snap.youtubeTracks);
      setLikedIds(snap.likedIds);
      setPlaylists(snap.playlists);
      setFolders(snap.folders);
      setRecentIds(snap.recentIds);
      setPlayCounts(snap.playCounts);
      const moved = await migrateLegacyTracks(snap.youtubeTracks);
      if (moved) {
        setYoutubeTracks(moved);
        saveYoutubeTracks(moved);
      }
    })();
  }, []);

  const reconcileDownloads = useCallback(async () => {
    const onDisk = await scanDownloadedYoutube();
    if (onDisk.length === 0) return;
    setYoutubeTracks(prev => {
      const known = new Set(prev.map(t => t.id));
      const fresh = onDisk.filter(t => !known.has(t.id));
      if (fresh.length === 0) return prev;
      const next = [...fresh, ...prev];
      saveYoutubeTracks(next);
      return next;
    });
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
      await reconcileDownloads();
    } finally {
      setScanning(false);
    }
  }, [reconcileDownloads]);

  useEffect(() => {
    rescanLocal();
  }, [rescanLocal]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active' && permissionDenied) rescanLocal();
    });
    return () => sub.remove();
  }, [permissionDenied, rescanLocal]);

  const addYoutube = useCallback((track: AppTrack) => {
    setYoutubeTracks(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      const next = [track, ...prev];
      saveYoutubeTracks(next);
      return next;
    });
  }, []);

  const removeYoutube = useCallback((id: string) => {
    const target = ytRef.current.find(t => t.id === id);
    if (target?.url) deleteDownloadedFile(target.url);
    setYoutubeTracks(prev => {
      const next = prev.filter(t => t.id !== id);
      saveYoutubeTracks(next);
      return next;
    });
  }, []);

  const patchDownload = useCallback((id: string, patch: Partial<Download>) => {
    setDownloads(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const id = makeId();
    setPlaylists(prev => {
      const next = [...prev, { id, name: name.trim() || 'Playlist', trackIds: [] }];
      savePlaylists(next);
      return next;
    });
    return id;
  }, []);

  const addToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists(prev => {
      const next = prev.map(p =>
        p.id === playlistId && !p.trackIds.includes(trackId)
          ? { ...p, trackIds: [...p.trackIds, trackId] }
          : p,
      );
      savePlaylists(next);
      return next;
    });
  }, []);

  const runDownload = useCallback(
    (job: { url: string; meta?: DownloadMeta; attempts: number }) => {
      const id = extractYoutubeId(job.url);
      if (!id) return;
      activeRef.current += 1;

      downloadYoutubeAudio(
        job.url,
        pct => patchDownload(id, { status: 'downloading', progress: pct }),
        info =>
          patchDownload(id, {
            title: job.meta?.title ?? info.title,
            artwork: job.meta?.albumCover ?? info.thumbnail,
          }),
      )
        .then(track => {
          const merged: AppTrack = {
            ...track,
            albumId: job.meta?.albumId,
            album: job.meta?.album,
            albumArtist: job.meta?.albumArtist,
            albumCover: job.meta?.albumCover,
            trackNumber: job.meta?.trackNumber,
            artwork: track.artwork ?? job.meta?.albumCover,
          };
          addYoutube(merged);
          if (job.meta?.playlistId) addToPlaylist(job.meta.playlistId, merged.id);
          patchDownload(id, {
            status: 'done',
            progress: 1,
            title: merged.title,
            artwork: merged.artwork,
          });
        })
        .catch(e => {
          if (job.attempts + 1 < MAX_DOWNLOAD_ATTEMPTS) {
            patchDownload(id, { status: 'extracting', progress: 0 });
            setTimeout(() => {
              queueRef.current.push({ ...job, attempts: job.attempts + 1 });
              pumpRef.current();
            }, RETRY_DELAY_MS * (job.attempts + 1));
          } else {
            patchDownload(id, {
              status: 'error',
              error: e?.message ?? t('downloadFailed'),
            });
          }
        })
        .finally(() => {
          activeRef.current -= 1;
          pumpRef.current();
        });
    },
    [addYoutube, addToPlaylist, patchDownload],
  );

  const pumpRef = useRef<() => void>(() => {});
  pumpRef.current = () => {
    while (activeRef.current < MAX_PARALLEL_DOWNLOADS && queueRef.current.length > 0) {
      const job = queueRef.current.shift()!;
      runDownload(job);
    }
  };

  /**
   * Queues a download instead of firing every request at once: YouTube aborts
   * connections when a whole playlist is fetched in parallel, so only a couple
   * run at a time and failures are retried with a growing delay.
   */
  const startDownload = useCallback(
    (url: string, meta?: DownloadMeta) => {
      const id = extractYoutubeId(url);
      if (!id) return;

      let skip = false;
      setDownloads(prev => {
        const existing = prev.find(d => d.id === id);
        if (existing && existing.status !== 'error') {
          skip = true;
          return prev;
        }
        const entry: Download = {
          id,
          title: meta?.title ?? t('preparing'),
          artwork: meta?.albumCover,
          status: 'extracting',
          progress: 0,
        };
        return [entry, ...prev.filter(d => d.id !== id)];
      });
      if (skip) return;

      queueRef.current.push({ url, meta, attempts: 0 });
      pumpRef.current();
    },
    [],
  );

  const MAX_COLLECTION = 50;

  const playlistsRef = useRef(playlists);
  playlistsRef.current = playlists;

  const getOrCreatePlaylist = useCallback(
    (name: string) => {
      const existing = playlistsRef.current.find(
        p => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      if (existing) return existing.id;
      return createPlaylist(name);
    },
    [createPlaylist],
  );

  const downloadCollection = useCallback(
    async (url: string): Promise<CollectionDownloadResult> => {
      const pl = await getPlaylist(url);
      const listId = extractPlaylistId(url);
      const isAlbum = !!listId && isAlbumPlaylistId(listId);
      const items = pl.items.slice(0, MAX_COLLECTION);
      const playlistId = isAlbum ? undefined : getOrCreatePlaylist(pl.title);

      items.forEach((it, i) => {
        startDownload(it.url, {
          playlistId,
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
    [startDownload, getOrCreatePlaylist],
  );

  const clearFinishedDownloads = useCallback(() => {
    setDownloads(prev =>
      prev.filter(d => d.status === 'extracting' || d.status === 'downloading'),
    );
  }, []);

  const activeDownloadCount = downloads.filter(
    d => d.status === 'extracting' || d.status === 'downloading',
  ).length;

  const markPlayed = useCallback((id: string) => {
    setRecentIds(prev => {
      if (prev[0] === id) return prev;
      const next = [id, ...prev.filter(x => x !== id)].slice(0, RECENT_MAX);
      saveRecents(next);
      return next;
    });
    setPlayCounts(prev => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      savePlayCounts(next);
      return next;
    });
  }, []);

  const removeAlbum = useCallback((albumId: string) => {
    setYoutubeTracks(prev => {
      prev.filter(t => t.albumId === albumId).forEach(t => deleteDownloadedFile(t.url));
      const next = prev.filter(t => t.albumId !== albumId);
      saveYoutubeTracks(next);
      return next;
    });
  }, []);

  const tracksById = React.useMemo(() => {
    const map: Record<string, AppTrack> = {};
    for (const track of localTracks) map[track.id] = track;
    for (const track of youtubeTracks) map[track.id] = track;
    return map;
  }, [localTracks, youtubeTracks]);

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

  const likedTracks = React.useMemo(
    () =>
      likedIds
        .map(id => tracksById[id] || likedSnapshots[id])
        .filter(Boolean) as AppTrack[],
    [likedIds, tracksById, likedSnapshots],
  );

  const isLiked = useCallback((id: string) => likedIds.includes(id), [likedIds]);

  const toggleLike = useCallback((track: AppTrack) => {
    setLikedSnapshots(prev => ({ ...prev, [track.id]: track }));
    setLikedIds(prev => {
      const next = prev.includes(track.id)
        ? prev.filter(x => x !== track.id)
        : [track.id, ...prev];
      saveLikes(next);
      return next;
    });
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => {
      const next = prev.filter(p => p.id !== id);
      savePlaylists(next);
      return next;
    });
    setFolders(prev => {
      const next = prev.map(f =>
        f.playlistIds.includes(id)
          ? { ...f, playlistIds: f.playlistIds.filter(p => p !== id) }
          : f,
      );
      saveFolders(next);
      return next;
    });
  }, []);

  const createFolder = useCallback((name: string) => {
    const id = makeId();
    setFolders(prev => {
      const next = [...prev, { id, name: name.trim() || 'Folder', playlistIds: [] }];
      saveFolders(next);
      return next;
    });
    return id;
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => {
      const next = prev.filter(f => f.id !== id);
      saveFolders(next);
      return next;
    });
  }, []);

  const addPlaylistToFolder = useCallback((folderId: string, playlistId: string) => {
    setFolders(prev => {
      const next = prev.map(f => {
        const cleaned = f.playlistIds.filter(p => p !== playlistId);
        return f.id === folderId
          ? { ...f, playlistIds: [...cleaned, playlistId] }
          : { ...f, playlistIds: cleaned };
      });
      saveFolders(next);
      return next;
    });
  }, []);

  const removePlaylistFromFolder = useCallback((playlistId: string) => {
    setFolders(prev => {
      const next = prev.map(f => ({
        ...f,
        playlistIds: f.playlistIds.filter(p => p !== playlistId),
      }));
      saveFolders(next);
      return next;
    });
  }, []);

  const removeFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists(prev => {
      const next = prev.map(p =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter(x => x !== trackId) }
          : p,
      );
      savePlaylists(next);
      return next;
    });
  }, []);

  const playlistTracks = useCallback(
    (playlist: Playlist) =>
      playlist.trackIds
        .map(id => tracksById[id] || likedSnapshots[id])
        .filter(Boolean) as AppTrack[],
    [tracksById, likedSnapshots],
  );

  const reloadLibrary = useCallback(() => {
    const snap = loadSnapshot();
    setYoutubeTracks(snap.youtubeTracks);
    setLikedIds(snap.likedIds);
    setPlaylists(snap.playlists);
    setFolders(snap.folders);
    setRecentIds(snap.recentIds);
    setPlayCounts(snap.playCounts);
  }, []);

  const value: LibraryState = {
    localTracks,
    youtubeTracks,
    likedIds,
    playlists,
    folders,
    scanning,
    permissionDenied,
    downloads,
    activeDownloadCount,
    startDownload,
    downloadCollection,
    clearFinishedDownloads,
    recentIds,
    playCounts,
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
    createFolder,
    deleteFolder,
    addPlaylistToFolder,
    removePlaylistFromFolder,
    addToPlaylist,
    removeFromPlaylist,
    playlistTracks,
    reloadLibrary,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryState {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
