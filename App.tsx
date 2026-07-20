/**
 * MusicApp — lecteur de musique locale + téléchargement audio YouTube.
 * @format
 */

import {
  Home09Icon,
  LibraryIcon,
  Settings01Icon,
  YoutubeIcon,
} from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ActionSheetProvider } from './src/components/ActionSheet';
import { ConfirmProvider } from './src/components/ConfirmSheet';
import AddToPlaylistSheet from './src/components/AddToPlaylistSheet';
import Ic from './src/components/Ic';
import PlayerBar from './src/components/PlayerBar';
import RecentTracker from './src/components/RecentTracker';
import WebServerSync from './src/components/WebServerSync';
import { Collection } from './src/lib/collections';
import CollectionDetailScreen from './src/screens/CollectionDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import QueueScreen from './src/screens/QueueScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import YoutubeScreen from './src/screens/YoutubeScreen';
import { LibraryProvider } from './src/store/library';
import { theme } from './src/theme';
import { AppTrack } from './src/types';

type Tab = 'home' | 'library' | 'youtube' | 'settings';

function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('home');
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [addTarget, setAddTarget] = useState<AppTrack | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      ).catch(() => {});
    }
  }, []);

  const openCollection = (c: Collection) => setDetailKey(c.key);

  return (
    <SafeAreaProvider>
      <LibraryProvider>
       <ActionSheetProvider>
        <ConfirmProvider>
        <RecentTracker />
        <WebServerSync />
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={[styles.screen, tab !== 'home' && styles.hidden]}>
            <HomeScreen onOpen={openCollection} onAddToPlaylist={setAddTarget} />
          </View>
          <View style={[styles.screen, tab !== 'library' && styles.hidden]}>
            <LibraryScreen onOpen={openCollection} />
          </View>
          {/* Kept mounted so the YouTube WebView preserves its navigation. */}
          <View style={[styles.screen, tab !== 'youtube' && styles.hidden]}>
            <YoutubeScreen active={tab === 'youtube'} />
          </View>
          <View style={[styles.screen, tab !== 'settings' && styles.hidden]}>
            <SettingsScreen />
          </View>

          <PlayerBar onPress={() => setShowNowPlaying(true)} />

          <View style={styles.tabBar}>
            <TabButton
              label="Accueil"
              icon={Home09Icon}
              active={tab === 'home'}
              onPress={() => setTab('home')}
            />
            <TabButton
              label="Bibliothèque"
              icon={LibraryIcon}
              active={tab === 'library'}
              onPress={() => setTab('library')}
            />
            <TabButton
              label="YouTube"
              icon={YoutubeIcon}
              active={tab === 'youtube'}
              onPress={() => setTab('youtube')}
            />
            <TabButton
              label="Réglages"
              icon={Settings01Icon}
              active={tab === 'settings'}
              onPress={() => setTab('settings')}
            />
          </View>
        </SafeAreaView>

        <CollectionDetailScreen
          collectionKey={detailKey}
          onBack={() => setDetailKey(null)}
          onAddToPlaylist={setAddTarget}
          onOpenNowPlaying={() => setShowNowPlaying(true)}
        />
        <NowPlayingScreen
          visible={showNowPlaying}
          onClose={() => setShowNowPlaying(false)}
          onAddToPlaylist={setAddTarget}
          onOpenQueue={() => setShowQueue(true)}
        />
        <QueueScreen visible={showQueue} onClose={() => setShowQueue(false)} />
        <AddToPlaylistSheet track={addTarget} onClose={() => setAddTarget(null)} />
        </ConfirmProvider>
       </ActionSheetProvider>
      </LibraryProvider>
    </SafeAreaProvider>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: any;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <Ic
        icon={icon}
        size={24}
        color={active ? theme.accent : theme.textDim}
        strokeWidth={active ? 2.3 : 1.9}
      />
      <Text style={[styles.tabLabel, active && styles.tabActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  screen: { flex: 1 },
  hidden: { display: 'none' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.bg2,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabLabel: { color: theme.textDim, fontSize: 11, marginTop: 3 },
  tabActive: { color: theme.accent, fontWeight: '700' },
});

export default App;
