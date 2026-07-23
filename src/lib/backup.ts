import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { exportSnapshot, importSnapshot } from '../db/database';

const BACKUP_NAME = 'musicapp-backup.json';
const BACKUP_PATH =
  RNFS.ExternalStorageDirectoryPath + '/Music/MusicApp/' + BACKUP_NAME;

const MediaSaver:
  | { publishText(name: string, content: string): Promise<string> }
  | undefined = NativeModules.MediaSaver;

/**
 * Writes the whole library state to Music/MusicApp/musicapp-backup.json in
 * public storage so it survives an uninstall. Returns the file path.
 */
export async function exportBackup(): Promise<string | null> {
  const json = exportSnapshot();
  if (MediaSaver) {
    try {
      return await MediaSaver.publishText(BACKUP_NAME, json);
    } catch {
      return null;
    }
  }
  return null;
}

export async function importBackup(): Promise<boolean> {
  try {
    const exists = await RNFS.exists(BACKUP_PATH);
    if (!exists) return false;
    const json = await RNFS.readFile(BACKUP_PATH, 'utf8');
    return importSnapshot(json);
  } catch {
    return false;
  }
}

export async function hasBackup(): Promise<boolean> {
  return RNFS.exists(BACKUP_PATH).catch(() => false);
}
