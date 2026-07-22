import {
  AlbumIcon,
  ArrowLeft01Icon,
  Download04Icon,
  MusicNoteSquare01Icon,
  NoInternetIcon,
  Playlist03Icon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';
import React, { useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import DownloadsSheet from '../components/DownloadsSheet';
import Ic from '../components/Ic';
import { t as tr, useI18n } from '../i18n';
import {
  extractPlaylistId,
  extractYoutubeId,
  isAlbumPlaylistId,
} from '../lib/ytExtractor';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';

type Props = {
  visible: boolean;
  initialUrl?: string;
  onClose: () => void;
};

/** Legacy in-app YouTube browser, kept as a fallback to the native tab. */
export default function YoutubeWebScreen({ visible, initialUrl, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { startDownload, downloadCollection, activeDownloadCount, downloads } = useLibrary();
  const [sheetOpen, setSheetOpen] = useState(false);
  const webRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [offline, setOffline] = useState(false);

  const retry = () => {
    setOffline(false);
    webRef.current?.reload();
  };

  const onRequestClose = () => {
    if (canGoBack && webRef.current) webRef.current.goBack();
    else onClose();
  };

  const videoId = extractYoutubeId(currentUrl);
  const playlistId = extractPlaylistId(currentUrl);
  const isAlbum = !!playlistId && isAlbumPlaylistId(playlistId);

  const downloadList = async () => {
    if (collecting) return;
    setCollecting(true);
    try {
      const res = await downloadCollection(currentUrl);
      const kind = res.isAlbum ? tr('album') : tr('playlist');
      const capped =
        res.total > res.queued ? ` (max ${res.queued}/${res.total})` : '';
      ToastAndroid.show(
        tr('collectionQueued', { kind, title: res.title, n: res.queued, capped }),
        ToastAndroid.LONG,
      );
    } catch (e: any) {
      ToastAndroid.show(e?.message ?? tr('cantFetchList'), ToastAndroid.SHORT);
    } finally {
      setCollecting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onRequestClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.topBtn}>
            <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t('webVersion')}</Text>
          <View style={styles.topBtn} />
        </View>

        <WebView
          key={initialUrl ?? 'home'}
          ref={webRef}
          source={{ uri: initialUrl ?? 'https://m.youtube.com' }}
          style={styles.web}
          onNavigationStateChange={nav => {
            setCurrentUrl(nav.url);
            setCanGoBack(nav.canGoBack);
          }}
          onLoadStart={() => setOffline(false)}
          onError={({ nativeEvent }) => {
            if (nativeEvent.url && !nativeEvent.url.startsWith('about:')) {
              setOffline(true);
            }
          }}
          allowsBackForwardNavigationGestures
          mediaPlaybackRequiresUserAction
        />

        {offline && (
          <View style={styles.offline}>
            <Ic icon={NoInternetIcon} size={72} color={theme.textDim} strokeWidth={1.6} />
            <Text style={styles.offlineTitle}>{t('noConnection')}</Text>
            <Text style={styles.offlineMsg}>{t('noConnectionMsg')}</Text>
            <TouchableOpacity style={styles.retry} activeOpacity={0.85} onPress={retry}>
              <Ic icon={RefreshIcon} size={20} color="#1a1020" strokeWidth={2.3} />
              <Text style={styles.retryText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.fabs}>
          {playlistId && (
            <TouchableOpacity
              style={styles.smallFab}
              activeOpacity={0.85}
              onPress={downloadList}
              disabled={collecting}>
              <Ic
                icon={isAlbum ? AlbumIcon : Playlist03Icon}
                size={22}
                color={collecting ? theme.textFaint : theme.accent}
                strokeWidth={2.1}
              />
            </TouchableOpacity>
          )}
          {videoId && (
            <TouchableOpacity
              style={[styles.smallFab, styles.audioFab]}
              activeOpacity={0.85}
              onPress={() => {
                startDownload(currentUrl);
                ToastAndroid.show(t('preparing'), ToastAndroid.SHORT);
              }}>
              <Ic icon={MusicNoteSquare01Icon} size={22} color="#1a1020" strokeWidth={2.1} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.smallFab}
            activeOpacity={0.85}
            onPress={() => setSheetOpen(true)}>
            <Ic icon={Download04Icon} size={22} color={theme.text} strokeWidth={2.1} />
            {activeDownloadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeDownloadCount}</Text>
              </View>
            )}
            {activeDownloadCount === 0 && downloads.length > 0 && <View style={styles.dot} />}
          </TouchableOpacity>
        </View>

        <DownloadsSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  web: { flex: 1 },
  offline: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  offlineTitle: { color: theme.text, fontSize: 20, fontWeight: '800', marginTop: 18 },
  offlineMsg: {
    color: theme.textDim,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 22,
  },
  retryText: { color: '#1a1020', fontSize: 15, fontWeight: '800' },
  fabs: { position: 'absolute', right: 14, bottom: 18, gap: 12, alignItems: 'center' },
  smallFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.surfaceHi,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  audioFab: { backgroundColor: theme.accent, borderColor: theme.accent },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.bg,
  },
  badgeText: { color: '#1a1020', fontSize: 11, fontWeight: '800' },
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.accent,
  },
});
