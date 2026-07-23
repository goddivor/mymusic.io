import { NativeModules } from 'react-native';
import { t } from '../i18n';
import RNFS from 'react-native-fs';
import { AppTrack } from '../types';

const MediaSaver: { publishAudio(src: string, name: string): Promise<string>; deleteByPath(path: string): Promise<boolean> } | undefined =
  NativeModules.MediaSaver;

const { YtExtractor } = NativeModules as {
  YtExtractor: {
    getAudioStream(url: string): Promise<YtStreamInfo>;
    getPlaylist(url: string): Promise<YtPlaylist>;
    getSuggestions(query: string): Promise<string[]>;
    search(query: string): Promise<YtSearchPage>;
    searchMore(query: string): Promise<YtSearchPage>;
    getTrending(): Promise<{ items: YtVideoItem[] }>;
    getVideoInfo(url: string): Promise<YtVideoInfo>;
    getComments(url: string): Promise<{ items: YtComment[] }>;
  };
};

export type YtStreamInfo = {
  title: string;
  uploader: string;
  audioUrl: string;
  ext: string;
  duration: number;
  bitrate: number;
  thumbnail: string;
};

export type YtPlaylistItem = {
  url: string;
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
};

export type YtPlaylist = {
  title: string;
  uploader: string;
  thumbnail: string;
  items: YtPlaylistItem[];
};

export type YtVideoItem = {
  url: string;
  title: string;
  uploader: string;
  duration: number;
  views: number;
  uploadedDate: string;
  thumbnail: string;
};

export type YtSearchPage = {
  items: YtVideoItem[];
  hasMore: boolean;
};

export type YtVideoInfo = {
  url: string;
  title: string;
  uploader: string;
  uploaderAvatar: string;
  views: number;
  likes: number;
  duration: number;
  thumbnail: string;
  description: string;
  audioUrl: string;
  ext: string;
  related: YtVideoItem[];
};

export type YtComment = {
  author: string;
  avatar: string;
  text: string;
  likes: number;
  date: string;
};

export function getSuggestions(query: string): Promise<string[]> {
  return YtExtractor.getSuggestions(query);
}

export function searchYoutube(query: string): Promise<YtSearchPage> {
  return YtExtractor.search(query);
}

export function searchYoutubeMore(query: string): Promise<YtSearchPage> {
  return YtExtractor.searchMore(query);
}

export function getTrending(): Promise<{ items: YtVideoItem[] }> {
  return YtExtractor.getTrending();
}

export function getVideoInfo(url: string): Promise<YtVideoInfo> {
  return YtExtractor.getVideoInfo(url);
}

export function getComments(url: string): Promise<{ items: YtComment[] }> {
  return YtExtractor.getComments(url);
}

export function deleteDownloadedFile(url: string): void {
  MediaSaver?.deleteByPath(url).catch(() => {});
}

const LEGACY_DIR = '/files/youtube/';

/**
 * Moves a download left in the app's private folder by an older version into
 * the public Music/MusicApp collection. Returns the new file url, or null when
 * nothing had to be moved.
 */
export async function migrateLegacyDownload(
  url: string,
  title: string,
): Promise<string | null> {
  if (!MediaSaver || !url.includes(LEGACY_DIR)) return null;
  const path = url.startsWith('file://') ? url.slice(7) : url;
  try {
    if (!(await RNFS.exists(path))) return null;
    const ext = (path.split('.').pop() || 'm4a').toLowerCase();
    const idMatch = path.match(/([A-Za-z0-9_-]{11})\.[^.]+$/);
    const safeTitle = (title || 'audio')
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\.(mp4|m4a|webm|opus|mp3)$/i, '')
      .trim()
      .slice(0, 120);
    const name = idMatch
      ? `${safeTitle} [${idMatch[1]}].${ext}`
      : `${safeTitle}.${ext}`;
    const published = await MediaSaver.publishAudio(path, name);
    await RNFS.unlink(path).catch(() => {});
    return 'file://' + published;
  } catch {
    return null;
  }
}

export function getPlaylist(url: string): Promise<YtPlaylist> {
  return YtExtractor.getPlaylist(url);
}

export function extractPlaylistId(url: string): string | null {
  const m = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// YouTube Music albums use playlist ids that start with "OLAK".
export function isAlbumPlaylistId(listId: string): boolean {
  return /^OLAK/i.test(listId);
}

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function getAudioStream(url: string): Promise<YtStreamInfo> {
  return YtExtractor.getAudioStream(url);
}

/**
 * Extracts the best audio stream for a YouTube URL and downloads it to the
 * public Music/MusicApp storage (survives uninstall, re-indexed by the device),
 * returning a playable AppTrack. A clean canonical watch URL is rebuilt from
 * the video id because NewPipeExtractor rejects URLs cluttered with
 * list/start_radio/pp params.
 */
export async function downloadYoutubeAudio(
  url: string,
  onProgress?: (pct: number) => void,
  onInfo?: (info: { title: string; uploader: string; thumbnail: string }) => void,
): Promise<AppTrack> {
  const id = extractYoutubeId(url);
  if (!id) throw new Error(t('invalidYoutubeUrl'));

  const cleanUrl = `https://www.youtube.com/watch?v=${id}`;
  const info = await getAudioStream(cleanUrl);
  if (onInfo) {
    onInfo({ title: info.title, uploader: info.uploader, thumbnail: info.thumbnail });
  }

  const rawExt = (info.ext || 'm4a').toLowerCase();
  const ext = rawExt === 'mp4' || rawExt === 'mpeg4' ? 'm4a' : rawExt;
  const tmp = `${RNFS.CachesDirectoryPath}/${id}.${ext}`;

  const task = RNFS.downloadFile({
    fromUrl: info.audioUrl,
    toFile: tmp,
    progressInterval: 300,
    progress: res => {
      if (onProgress && res.contentLength > 0) {
        onProgress(res.bytesWritten / res.contentLength);
      }
    },
  });
  const result = await task.promise;
  if (result.statusCode >= 400) {
    throw new Error(t('downloadHttpError', { code: result.statusCode }));
  }

  const safeTitle = (info.title || id)
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\.(mp4|m4a|webm|opus|mp3)$/i, '')
    .trim()
    .slice(0, 120);
  const fileName = `${safeTitle} [${id}].${ext}`;
  let finalPath = tmp;
  if (MediaSaver) {
    try {
      finalPath = await MediaSaver.publishAudio(tmp, fileName);
      await RNFS.unlink(tmp).catch(() => {});
    } catch {
      finalPath = tmp;
    }
  }

  return {
    id: 'youtube:' + id,
    url: 'file://' + finalPath,
    title: info.title || 'YouTube',
    artist: info.uploader || 'YouTube',
    artwork: info.thumbnail || undefined,
    duration: info.duration,
    source: 'youtube',
  };
}
