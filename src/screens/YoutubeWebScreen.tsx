import {
  AlbumIcon,
  ArrowLeft01Icon,
  DownloadCircle01Icon,
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
  onClose: () => void;
};

/** Legacy in-app YouTube browser, kept as a fallback to the native tab. */
export default function YoutubeWebScreen({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { startDownload, downloadCollection } = useLibrary();
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
          ref={webRef}
          source={{ uri: 'https://m.youtube.com' }}
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

        <View style={styles.pills}>
          {playlistId && (
            <TouchableOpacity
              style={[styles.pill, styles.pillAlt]}
              activeOpacity={0.85}
              onPress={downloadList}
              disabled={collecting}>
              <Ic
                icon={isAlbum ? AlbumIcon : Playlist03Icon}
                size={20}
                color={theme.text}
                strokeWidth={2.2}
              />
              <Text style={styles.pillAltText}>
                {collecting
                  ? t('preparing')
                  : isAlbum
                  ? t('downloadAlbum')
                  : t('downloadPlaylist')}
              </Text>
            </TouchableOpacity>
          )}
          {videoId && (
            <TouchableOpacity
              style={styles.pill}
              activeOpacity={0.85}
              onPress={() => startDownload(currentUrl)}>
              <Ic icon={DownloadCircle01Icon} size={22} color="#1a1020" strokeWidth={2.2} />
              <Text style={styles.pillText}>{t('downloadAudio')}</Text>
            </TouchableOpacity>
          )}
        </View>
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
  pills: { position: 'absolute', left: 16, right: 16, bottom: 20, gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: 28,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  pillText: { color: '#1a1020', fontSize: 15, fontWeight: '800' },
  pillAlt: {
    backgroundColor: theme.surfaceHi,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillAltText: { color: theme.text, fontSize: 15, fontWeight: '700' },
});
