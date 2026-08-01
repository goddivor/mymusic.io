import { NativeModules } from 'react-native';
import { exportSnapshot, importSnapshot } from '../db/database';
import { getSettings, saveSettings } from '../store/settings';

const BACKUP_NAME = 'musicapp-backup.json';

type BackupNative = {
  pickFolder(): Promise<string | null>;
  pickFile(): Promise<string | null>;
  writeToFolder(treeUri: string, fileName: string, content: string): Promise<string>;
  readFromFolder(treeUri: string, fileName: string): Promise<string | null>;
};

const Native: BackupNative | undefined = NativeModules.Backup;

export function hasBackupFolder(): boolean {
  return !!getSettings().backupFolderUri;
}

/** Opens the system folder picker; persists the chosen tree URI. Returns it or null if cancelled. */
export async function chooseBackupFolder(): Promise<string | null> {
  if (!Native) return null;
  const uri = await Native.pickFolder().catch(() => null);
  if (uri) await saveSettings({ backupFolderUri: uri });
  return uri;
}

/** Writes the current library snapshot to the chosen folder. Picks a folder first if none is set. */
export async function exportBackup(): Promise<boolean> {
  if (!Native) return false;
  let folder = getSettings().backupFolderUri;
  if (!folder) folder = await chooseBackupFolder();
  if (!folder) return false;
  try {
    await Native.writeToFolder(folder, BACKUP_NAME, exportSnapshot());
    return true;
  } catch {
    return false;
  }
}

/** Silent best-effort backup used by auto-backup; never prompts. */
export async function autoBackup(): Promise<void> {
  const { autoBackup: on, backupFolderUri: folder } = getSettings();
  if (!Native || !on || !folder) return;
  try {
    await Native.writeToFolder(folder, BACKUP_NAME, exportSnapshot());
  } catch {}
}

/** Reads the backup from the chosen folder (used for automatic restore). */
export async function importFromFolder(): Promise<boolean> {
  const folder = getSettings().backupFolderUri;
  if (!Native || !folder) return false;
  try {
    const json = await Native.readFromFolder(folder, BACKUP_NAME);
    return json ? importSnapshot(json) : false;
  } catch {
    return false;
  }
}

/** Lets the user pick a backup file anywhere (used after a reinstall). */
export async function restoreFromFile(): Promise<boolean> {
  if (!Native) return false;
  try {
    const json = await Native.pickFile();
    return json ? importSnapshot(json) : false;
  } catch {
    return false;
  }
}
