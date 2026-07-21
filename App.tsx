/**
 * MusicApp — lecteur de musique locale + téléchargement audio YouTube.
 * @format
 */

import {
  ArrowLeft01Icon,
  Home09Icon,
  LibraryIcon,
  YoutubeIcon,
} from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ActionSheetProvider } from './src/components/ActionSheet';
import { ConfirmProvider } from './src/components/ConfirmSheet';
import AddToPlaylistSheet from './src/components/AddToPlaylistSheet';
import Ic from './src/components/Ic';
import DrawerLayout from './src/components/DrawerLayout';
import PlayerBar from './src/components/PlayerBar';
import ProfileDrawer, { DrawerItemKey } from './src/components/ProfileDrawer';
import RecentTracker from './src/components/RecentTracker';
import WebServerSync from './src/components/WebServerSync';
import { Collection } from './src/lib/collections';
import CollectionDetailScreen from './src/screens/CollectionDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import QueueScreen from './src/screens/QueueScreen';
import RecentsScreen from './src/screens/RecentsScreen';
import SearchScreen from './src/screens/SearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import YoutubeScreen from './src/screens/YoutubeScreen';
import { useI18n } from './src/i18n';
import { LibraryProvider } from './src/store/library';
import { ThemeProvider, useScheme, useTheme, useThemedStyles } from './src/store/theme';
import { Palette } from './src/theme';
import { AppTrack } from './src/types';

type Tab = 'home' | 'library' | 'youtube';

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner(): React.JSX.Element {
  const scheme = useScheme();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('home');
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [addTarget, setAddTarget] = useState<AppTrack | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showRecents, setShowRecents] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const onDrawerSelect = (key: DrawerItemKey) => {
    setShowDrawer(false);
    switch (key) {
      case 'recents':
        setShowRecents(true);
        break;
      case 'settings':
        setShowSettings(true);
        break;
      case 'connect':
      case 'playerStyles':
      case 'stats':
        ToastAndroid.show(t('comingSoon'), ToastAndroid.SHORT);
        break;
    }
  };

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
        <StatusBar
          barStyle={scheme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor="transparent"
          translucent
        />
        <DrawerLayout
          open={showDrawer}
          gestureEnabled={tab === 'home'}
          onOpen={() => setShowDrawer(true)}
          onClose={() => setShowDrawer(false)}
          drawer={<ProfileDrawer onSelect={onDrawerSelect} />}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={[styles.screen, tab !== 'home' && styles.hidden]}>
            <HomeScreen
              onOpen={openCollection}
              onAddToPlaylist={setAddTarget}
              onOpenProfile={() => setShowDrawer(true)}
              onOpenSearch={() => setShowSearch(true)}
            />
          </View>
          <View style={[styles.screen, tab !== 'library' && styles.hidden]}>
            <LibraryScreen onOpen={openCollection} />
          </View>
          {/* Kept mounted so the YouTube WebView preserves its navigation. */}
          <View style={[styles.screen, tab !== 'youtube' && styles.hidden]}>
            <YoutubeScreen active={tab === 'youtube'} />
          </View>

          <PlayerBar onPress={() => setShowNowPlaying(true)} />

          <View style={styles.tabBar}>
            <TabButton
              label={t('tabHome')}
              icon={Home09Icon}
              active={tab === 'home'}
              onPress={() => setTab('home')}
            />
            <TabButton
              label={t('tabLibrary')}
              icon={LibraryIcon}
              active={tab === 'library'}
              onPress={() => setTab('library')}
            />
            <TabButton
              label={t('tabYoutube')}
              icon={YoutubeIcon}
              active={tab === 'youtube'}
              onPress={() => setTab('youtube')}
            />
          </View>
        </SafeAreaView>
        </DrawerLayout>

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

        <SearchScreen visible={showSearch} onClose={() => setShowSearch(false)} />
        <RecentsScreen visible={showRecents} onClose={() => setShowRecents(false)} />
        <Modal
          visible={showSettings}
          animationType="slide"
          onRequestClose={() => setShowSettings(false)}>
          <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <TouchableOpacity
              style={styles.modalBack}
              activeOpacity={0.7}
              onPress={() => setShowSettings(false)}>
              <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
              <Text style={styles.modalBackLabel}>{t('back')}</Text>
            </TouchableOpacity>
            <SettingsScreen />
          </SafeAreaView>
        </Modal>
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
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (theme: Palette) => StyleSheet.create({
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
  modalBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  modalBackLabel: { color: theme.text, fontSize: 15, fontWeight: '600', marginLeft: 8 },
});

export default App;
