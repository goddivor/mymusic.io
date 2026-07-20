import {
  AlbumIcon,
  Download04Icon,
  DownloadCircle01Icon,
  NoInternetIcon,
  Playlist03Icon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import DownloadsSheet from '../components/DownloadsSheet';
import Ic from '../components/Ic';
import {
  extractPlaylistId,
  extractYoutubeId,
  isAlbumPlaylistId,
} from '../lib/ytExtractor';
import { useLibrary } from '../store/library';
import { theme } from '../theme';

export default function YoutubeScreen({ active }: { active: boolean }) {
  const { startDownload, downloadCollection, activeDownloadCount, downloads } =
    useLibrary();
  const webRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [offline, setOffline] = useState(false);

  const retry = () => {
    setOffline(false);
    webRef.current?.reload();
  };

  // Hardware back navigates within the WebView instead of leaving the app.
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [active, canGoBack]);

  const videoId = extractYoutubeId(currentUrl);
  const playlistId = extractPlaylistId(currentUrl);
  const isAlbum = !!playlistId && isAlbumPlaylistId(playlistId);

  const downloadList = async () => {
    if (collecting) return;
    setCollecting(true);
    try {
      const res = await downloadCollection(currentUrl);
      const kind = res.isAlbum ? 'Album' : 'Playlist';
      const capped =
        res.total > res.queued ? ` (max ${res.queued}/${res.total})` : '';
      ToastAndroid.show(
        `${kind} « ${res.title} » — ${res.queued} titres en téléchargement${capped}`,
        ToastAndroid.LONG,
      );
    } catch (e: any) {
      ToastAndroid.show(
        e?.message ?? 'Impossible de récupérer la liste',
        ToastAndroid.SHORT,
      );
    } finally {
      setCollecting(false);
    }
  };

  return (
    <View style={styles.container}>
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
          // Main-frame failure (no connection, DNS, etc.) → show offline screen.
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
          <Text style={styles.offlineTitle}>Pas de connexion</Text>
          <Text style={styles.offlineMsg}>
            Vérifie ton réseau pour parcourir et télécharger depuis YouTube.
          </Text>
          <TouchableOpacity style={styles.retry} activeOpacity={0.85} onPress={retry}>
            <Ic icon={RefreshIcon} size={20} color="#1a1020" strokeWidth={2.3} />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.pills}>
        {/* Whole album / playlist */}
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
                ? 'Préparation…'
                : isAlbum
                ? "Télécharger l'album"
                : 'Télécharger la playlist'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Current video — fires in the background, no popup. */}
        {videoId && (
          <TouchableOpacity
            style={styles.pill}
            activeOpacity={0.85}
            onPress={() => startDownload(currentUrl)}>
            <Ic icon={DownloadCircle01Icon} size={22} color="#1a1020" strokeWidth={2.2} />
            <Text style={styles.pillText}>Télécharger en audio</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Floating button → downloads list */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setSheetOpen(true)}>
        <Ic icon={Download04Icon} size={26} color="#fff" strokeWidth={2.1} />
        {activeDownloadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeDownloadCount}</Text>
          </View>
        )}
        {activeDownloadCount === 0 && downloads.length > 0 && (
          <View style={styles.dot} />
        )}
      </TouchableOpacity>

      <DownloadsSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  web: { flex: 1 },
  offline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  offlineTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
  },
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
  pills: {
    position: 'absolute',
    left: 16,
    right: 84,
    bottom: 20,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: 28,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pillText: { color: '#1a1020', fontSize: 15, fontWeight: '800' },
  pillAlt: {
    backgroundColor: theme.surfaceHi,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillAltText: { color: theme.text, fontSize: 15, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.surfaceHi,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#000',
  },
  badgeText: { color: '#1a1020', fontSize: 12, fontWeight: '800' },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.accent,
  },
});
