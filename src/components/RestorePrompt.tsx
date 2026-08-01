import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { restoreFromFile } from '../lib/backup';
import { t } from '../i18n';
import { useLibrary } from '../store/library';
import { getSettings, saveSettings } from '../store/settings';

/**
 * On a fresh install (empty library after the initial scan), offers to restore
 * a backup from a file. Shown at most once per install via the restoreOffered flag.
 */
export default function RestorePrompt() {
  const { youtubeTracks, playlists, reloadLibrary } = useLibrary();
  const dataRef = useRef({ youtubeTracks, playlists });
  dataRef.current = { youtubeTracks, playlists };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (getSettings().restoreOffered) return;
      const { youtubeTracks: yt, playlists: pl } = dataRef.current;
      if (yt.length > 0 || pl.length > 0) return;
      saveSettings({ restoreOffered: true });
      Alert.alert(t('restorePromptTitle'), t('restorePrompt'), [
        { text: t('later'), style: 'cancel' },
        {
          text: t('restore'),
          onPress: async () => {
            const ok = await restoreFromFile();
            if (ok) reloadLibrary();
          },
        },
      ]);
    }, 3500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
