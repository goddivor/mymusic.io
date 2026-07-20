import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { AppTrack } from '../types';

const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'wma'];

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
    return; // dir missing or not readable
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

export async function scanLocalMusic(): Promise<AppTrack[]> {
  const acc: AppTrack[] = [];
  const ext = RNFS.ExternalStorageDirectoryPath;
  const roots = [`${ext}/Music`, `${ext}/Download`, RNFS.DownloadDirectoryPath];

  const visited = new Set<string>();
  for (const root of roots) {
    if (visited.has(root)) continue;
    visited.add(root);
    await scanDir(root, 3, acc);
  }

  const map = new Map<string, AppTrack>();
  for (const t of acc) map.set(t.id, t);
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}
