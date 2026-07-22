import { NativeModules } from 'react-native';
import { t } from '../i18n';
import RNFS from 'react-native-fs';
import { AppTrack } from '../types';

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
 * app's private storage, returning a playable AppTrack. Skips the download
 * if the file already exists. A clean canonical watch URL is rebuilt from the
 * video id because NewPipeExtractor rejects URLs cluttered with
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

  const dir = `${RNFS.DocumentDirectoryPath}/youtube`;
  await RNFS.mkdir(dir);
  const ext = info.ext || 'm4a';
  const dest = `${dir}/${id}.${ext}`;

  const alreadyDownloaded = await RNFS.exists(dest);
  if (!alreadyDownloaded) {
    const task = RNFS.downloadFile({
      fromUrl: info.audioUrl,
      toFile: dest,
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
  }

  return {
    id: 'youtube:' + id,
    url: 'file://' + dest,
    title: info.title || 'YouTube',
    artist: info.uploader || 'YouTube',
    artwork: info.thumbnail || undefined,
    duration: info.duration,
    source: 'youtube',
  };
}
