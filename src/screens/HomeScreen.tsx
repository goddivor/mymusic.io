import {
  Add01Icon,
  FavouriteIcon,
  MusicNote01Icon,
  PlayIcon,
  Queue01Icon,
  Search01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useActionSheet } from '../components/ActionSheet';
import GradientTile from '../components/GradientTile';
import Ic from '../components/Ic';
import { buildCollections, Collection } from '../lib/collections';
import { useI18n } from '../i18n';
import { playNext, playTracks } from '../lib/player';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import { AppTrack } from '../types';

type Props = {
  onOpen: (c: Collection) => void;
  onAddToPlaylist: (track: AppTrack) => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
};

type QuickItem =
  | { type: 'collection'; collection: Collection }
  | { type: 'track'; track: AppTrack };

export default function HomeScreen({
  onOpen,
  onAddToPlaylist,
  onOpenProfile,
  onOpenSearch,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const lib = useLibrary();
  const { show } = useActionSheet();
  const collections = buildCollections(lib);
  const liked = collections.find(c => c.kind === 'liked')!;
  const albumByKey = new Map(
    collections.filter(c => c.kind === 'album').map(c => [c.key, c]),
  );

  // Liked (pinned) + up to 4 most-recently-played items (LRU).
  const seen = new Set<string>();
  const recents: QuickItem[] = [];
  for (const id of lib.recentIds) {
    const t = lib.tracksById[id];
    if (!t) continue;
    if (t.albumId) {
      const key = 'album:' + t.albumId;
      if (seen.has(key)) continue;
      const col = albumByKey.get(key);
      if (col) {
        seen.add(key);
        recents.push({ type: 'collection', collection: col });
      }
    } else {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      recents.push({ type: 'track', track: t });
    }
    if (recents.length >= 4) break;
  }
  const youtube = collections.find(c => c.kind === 'youtube');
  const localCol = collections.find(c => c.kind === 'local');
  const quick: QuickItem[] = [
    { type: 'collection', collection: liked },
    ...recents,
    ...(youtube ? [{ type: 'collection' as const, collection: youtube }] : []),
  ];

  const onQuickPress = (item: QuickItem) => {
    if (item.type === 'collection') onOpen(item.collection);
    else playTracks([item.track], 0);
  };

  const openTrackMenu = (track: AppTrack) => {
    const liked = lib.isLiked(track.id);
    show({
      title: track.title,
      message: track.artist,
      actions: [
        { label: t('play'), icon: PlayIcon, onPress: () => playTracks([track], 0) },
        {
          label: liked ? t('unlike') : t('like'),
          icon: FavouriteIcon,
          onPress: () => lib.toggleLike(track),
        },
        { label: t('playNext'), icon: Queue01Icon, onPress: () => playNext(track) },
        {
          label: t('addToPlaylist'),
          icon: Add01Icon,
          onPress: () => onAddToPlaylist(track),
        },
      ],
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.7}
          onPress={onOpenProfile}>
          <Ic icon={UserCircleIcon} size={26} color={theme.textDim} strokeWidth={1.7} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('tabHome')}</Text>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          style={styles.searchBtn}
          activeOpacity={0.7}
          onPress={onOpenSearch}>
          <Ic icon={Search01Icon} size={22} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {quick.map((item, i) => {
          const cover =
            item.type === 'collection' ? item.collection.cover : item.track.artwork;
          const title =
            item.type === 'collection' ? item.collection.title : item.track.title;
          return (
            <TouchableOpacity
              key={item.type === 'collection' ? item.collection.key : item.track.id + i}
              style={styles.quickTile}
              activeOpacity={0.7}
              onPress={() => onQuickPress(item)}
              onLongPress={
                item.type === 'track' ? () => openTrackMenu(item.track) : undefined
              }
              delayLongPress={300}>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.quickThumb} />
              ) : item.type === 'collection' ? (
                <GradientTile colors={item.collection.gradient} size={48} radius={8}>
                  <Ic icon={item.collection.icon} size={22} color="#fff" strokeWidth={2.2} />
                </GradientTile>
              ) : (
                <View style={[styles.quickThumb, styles.quickPlaceholder]}>
                  <Ic icon={MusicNote01Icon} size={20} color={theme.textFaint} />
                </View>
              )}
              <Text style={styles.quickLabel} numberOfLines={2}>
                {title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Carousel
        title={t('recentlyAdded')}
        tracks={lib.youtubeTracks}
        emptyHint={t('downloadFromYoutubeHint')}
        onLongPressTrack={openTrackMenu}
        onShowAll={youtube ? () => onOpen(youtube) : undefined}
      />
      <Carousel
        title={t('yourLocalLibrary')}
        tracks={lib.localTracks}
        emptyHint={t('noAudioFound')}
        onLongPressTrack={openTrackMenu}
        onShowAll={localCol ? () => onOpen(localCol) : undefined}
      />
    </ScrollView>
  );
}

function Carousel({
  title,
  tracks,
  emptyHint,
  onLongPressTrack,
  onShowAll,
}: {
  title: string;
  tracks: AppTrack[];
  emptyHint: string;
  onLongPressTrack?: (t: AppTrack) => void;
  onShowAll?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onShowAll && tracks.length > 0 && (
          <TouchableOpacity onPress={onShowAll} activeOpacity={0.7}>
            <Text style={styles.showAll}>{t('showAll')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {tracks.length === 0 ? (
        <Text style={styles.empty}>{emptyHint}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}>
          {tracks.slice(0, 12).map((t, i) => (
            <TouchableOpacity
              key={t.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => playTracks(tracks, i)}
              onLongPress={onLongPressTrack ? () => onLongPressTrack(t) : undefined}
              delayLongPress={300}>
              <View style={styles.cardArtWrap}>
                {t.artwork ? (
                  <Image source={{ uri: t.artwork }} style={styles.cardArt} />
                ) : (
                  <View style={[styles.cardArt, styles.cardPlaceholder]}>
                    <Ic icon={MusicNote01Icon} size={34} color={theme.textFaint} />
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {t.title}
              </Text>
              <Text style={styles.cardArtist} numberOfLines={1}>
                {t.artist}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: theme.text, fontSize: 26, fontWeight: '800', marginLeft: 12 },
  headerSpacer: { flex: 1 },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 8,
  },
  quickTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  quickThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: theme.surfaceHi },
  quickPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  quickLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
    marginRight: 8,
    flex: 1,
  },
  section: { marginTop: 26 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { color: theme.text, fontSize: 19, fontWeight: '800' },
  showAll: { color: theme.accent, fontSize: 13, fontWeight: '700' },
  empty: { color: theme.textFaint, fontSize: 13, paddingHorizontal: 16 },
  card: { width: 140, marginRight: 14 },
  cardArtWrap: { width: 140, height: 140 },
  cardArt: { width: 140, height: 140, borderRadius: 10, backgroundColor: theme.surfaceHi },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: theme.text, fontSize: 13.5, fontWeight: '600', marginTop: 8 },
  cardArtist: { color: theme.textDim, fontSize: 12, marginTop: 2 },
});
