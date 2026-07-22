import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

export const GITHUB_REPO = 'goddivor/mymusic.io';
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
const RELEASES_LATEST_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const DISMISSED_KEY = 'update_dismissed_version';
const FETCH_TIMEOUT_MS = 10000;
const APK_PATH = RNFS.CachesDirectoryPath + '/mymusic-update.apk';

const AppUpdater:
  | { versionName: string; installApk(path: string): Promise<boolean> }
  | undefined = NativeModules.AppUpdater;

export type UpdateInfo = {
  available: boolean;
  current: string;
  latest: string | null;
  notes: string;
  apkUrl: string | null;
  pageUrl: string;
};

export function getCurrentVersion(): string {
  return AppUpdater?.versionName ?? '0.0.0';
}

function compareVersions(a: string, b: string): number {
  const pa = String(a).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

/**
 * Compares the installed version with the latest GitHub release and returns
 * the APK asset URL when a newer version exists. Fails silently offline.
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = getCurrentVersion();
  const none: UpdateInfo = {
    available: false,
    current,
    latest: null,
    notes: '',
    apkUrl: null,
    pageUrl: `${GITHUB_URL}/releases`,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(RELEASES_LATEST_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) return none;
    const release = await res.json();
    const latest = String(release.tag_name || '').replace(/^v/, '');
    if (!latest) return none;
    const apkAsset = (release.assets || []).find((a: any) =>
      a.name?.endsWith('.apk'),
    );
    return {
      available: compareVersions(latest, current) > 0,
      current,
      latest,
      notes: release.body || '',
      apkUrl: apkAsset?.browser_download_url ?? null,
      pageUrl: release.html_url || `${GITHUB_URL}/releases`,
    };
  } catch {
    return none;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Silent startup check: resolves with the update info only when a newer
 * version exists and this version has not been dismissed with "Later".
 */
export async function getStartupUpdate(): Promise<UpdateInfo | null> {
  const info = await checkForUpdate();
  if (!info.available) return null;
  const dismissed = await AsyncStorage.getItem(DISMISSED_KEY).catch(() => null);
  if (dismissed === info.latest) return null;
  return info;
}

export function dismissUpdateVersion(version: string): void {
  AsyncStorage.setItem(DISMISSED_KEY, String(version)).catch(() => {});
}

export function markdownToText(md: string): string {
  return String(md || '')
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .replace(/^\s*[-*+]\s+/gm, '•  ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type ApkDownload = {
  promise: Promise<string | null>;
  cancel: () => void;
};

/**
 * Downloads the release APK into the app cache with progress callbacks;
 * cancel() aborts the transfer and removes the partial file.
 */
export function createApkDownload(
  url: string,
  onProgress: (pct: number) => void,
): ApkDownload {
  let cancelled = false;
  let jobId: number | null = null;

  const promise = (async () => {
    await RNFS.unlink(APK_PATH).catch(() => {});
    const task = RNFS.downloadFile({
      fromUrl: url,
      toFile: APK_PATH,
      progressInterval: 250,
      progress: res => {
        if (res.contentLength > 0) {
          onProgress(res.bytesWritten / res.contentLength);
        }
      },
    });
    jobId = task.jobId;
    const result = await task.promise;
    if (cancelled) return null;
    if (result.statusCode >= 400) throw new Error(`HTTP ${result.statusCode}`);
    return APK_PATH;
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (jobId !== null) RNFS.stopDownload(jobId);
      RNFS.unlink(APK_PATH).catch(() => {});
    },
  };
}

export async function installApk(path: string): Promise<boolean> {
  if (!AppUpdater) return false;
  try {
    return await AppUpdater.installApk(path);
  } catch {
    return false;
  }
}
