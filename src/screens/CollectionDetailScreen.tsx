import {
  Add01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  FavouriteIcon,
  PlayIcon,
  Queue01Icon,
  RemoveCircleIcon,
  Search01Icon,
  ShuffleIcon,
} from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveTrack } from 'react-native-track-player';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useActionSheet } from '../components/ActionSheet';
import AddToPlaylistSheet from '../components/AddToPlaylistSheet';
import { useConfirm } from '../components/ConfirmSheet';
import GradientTile from '../components/GradientTile';
import Ic from '../components/Ic';
import SlideOverModal from '../components/SlideOverModal';
import TrackArt from '../components/TrackArt';
import PlayerBar from '../components/PlayerBar';
import TrackRow from '../components/TrackRow';
import { buildCollections } from '../lib/collections';
import { useI18n } from '../i18n';
import { getShuffle, playNext, playTracks, subscribePlayer } from '../lib/player';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import { AppTrack } from '../types';

type Props = {
  collectionKey: string | null;
  onBack: () => void;
  onAddToPlaylist: (track: AppTrack) => void;
  onOpenNowPlaying?: () => void;
};

const HEADER_H = 300;

export default function CollectionDetailScreen({
  collectionKey,
  onBack,
  onAddToPlaylist,
  onOpenNowPlaying,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const lib = useLibrary();
  const {
    isLiked,
    toggleLike,
    removeYoutube,
    removeFromPlaylist,
    removeManyYoutube,
    removeManyFromPlaylist,
  } = lib;
  const { show } = useActionSheet();
  const confirm = useConfirm();
  const active = useActiveTrack();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [shuffleOn, setShuffleOn] = useState(getShuffle());
  const [addTracks, setAddTracks] = useState<AppTrack[] | null>(null);

  const visible = collectionKey !== null;

  useEffect(() => {
    if (!visible) {
      setSearching(false);
      setQuery('');
      setSelectedIds(null);
      setAddTracks(null);
    }
  }, [visible, collectionKey]);
  const collection = collectionKey
    ? buildCollections(lib).find(c => c.key === collectionKey) ?? null
    : null;

  useEffect(() => subscribePlayer(() => setShuffleOn(getShuffle())), []);

  const inSelectRef = React.useRef(false);
  inSelectRef.current = selectedIds !== null;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (inSelectRef.current) {
        setSelectedIds(null);
        return true;
      }
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [visible, onBack]);

  if (!collection) {
    return (
      <SlideOverModal visible={visible} onRequestClose={onBack}>
        <View style={styles.fallback}>
          <TouchableOpacity onPress={onBack} style={styles.backFloating} hitSlop={12}>
            <Ic icon={ArrowLeft01Icon} size={26} color={theme.text} />
          </TouchableOpacity>
        </View>
      </SlideOverModal>
    );
  }

  const tracks = collection.tracks;
  const q = query.trim().toLowerCase();
  const displayTracks =
    searching && q
      ? tracks.filter(
          t =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q),
        )
      : tracks;

  const shufflePlay = () => {
    if (tracks.length) playTracks(tracks, 0, { shuffle: true, randomStart: true });
  };

  const selectMode = selectedIds !== null;
  const selTracks = selectMode
    ? tracks.filter(tk => selectedIds!.has(tk.id))
    : [];
  const downloadedIds = new Set(lib.youtubeTracks.map(tk => tk.id));

  const enterSelect = (item: AppTrack) => setSelectedIds(new Set([item.id]));
  const exitSelect = () => setSelectedIds(null);
  const toggleSelect = (item: AppTrack) =>
    setSelectedIds(prev => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  const selectAll = () =>
    setSelectedIds(new Set(displayTracks.map(tk => tk.id)));

  const playSelection = () => {
    if (selTracks.length) playTracks(selTracks, 0);
    exitSelect();
  };

  /**
   * Inserts the selection right after the active track; iterating reversed
   * keeps the selection order since each insert lands at activeIndex + 1.
   */
  const queueSelection = async () => {
    if (!selTracks.length) return;
    if (!active) {
      playTracks(selTracks, 0);
    } else {
      for (const tk of [...selTracks].reverse()) {
        await playNext(tk);
      }
    }
    exitSelect();
  };

  const deleteSelection = () => {
    const dl = selTracks.filter(tk => downloadedIds.has(tk.id));
    if (!dl.length) return;
    confirm({
      title: t('deleteSelectedQ'),
      message: t('deleteSelectedMsg', { n: String(dl.length) }),
      confirmLabel: t('delete'),
      destructive: true,
      onConfirm: () => {
        removeManyYoutube(dl.map(tk => tk.id));
        exitSelect();
      },
    });
  };

  const removeSelectionFromPlaylist = () => {
    const pid = collection.playlistId;
    if (!pid || !selTracks.length) return;
    confirm({
      title: t('removeFromPlaylistQ'),
      message: t('removeSelectedMsg', {
        n: String(selTracks.length),
        collection: collection.title,
      }),
      confirmLabel: t('remove'),
      destructive: true,
      onConfirm: () => {
        removeManyFromPlaylist(pid, selTracks.map(tk => tk.id));
        exitSelect();
      },
    });
  };

  const openMenu = (item: AppTrack) => {
    const liked = isLiked(item.id);
    const actions = [
      {
        label: t('select'),
        icon: CheckmarkCircle02Icon,
        onPress: () => enterSelect(item),
      },
      {
        label: liked ? t('unlike') : t('like'),
        icon: FavouriteIcon,
        onPress: () => toggleLike(item),
      },
      {
        label: t('playNext'),
        icon: Queue01Icon,
        onPress: () => playNext(item),
      },
      {
        label: t('addToPlaylist'),
        icon: Add01Icon,
        onPress: () => onAddToPlaylist(item),
      },
    ];
    if (collection.kind === 'youtube' || collection.kind === 'album') {
      actions.push({
        label: t('removeDownload'),
        icon: Delete02Icon,
        destructive: true,
        onPress: () =>
          confirm({
            title: t('removeDownloadQ'),
            message: t('removeDownloadMsg', { name: item.title }),
            confirmLabel: t('delete'),
            destructive: true,
            onConfirm: () => removeYoutube(item.id),
          }),
      } as any);
    }
    if (collection.kind === 'playlist' && collection.playlistId) {
      const pid = collection.playlistId;
      actions.push({
        label: t('removeFromPlaylist'),
        icon: RemoveCircleIcon,
        destructive: true,
        onPress: () =>
          confirm({
            title: t('removeFromPlaylistQ'),
            message: t('removeFromPlaylistMsg', { track: item.title, collection: collection.title }),
            confirmLabel: t('remove'),
            destructive: true,
            onConfirm: () => removeFromPlaylist(pid, item.id),
          }),
      } as any);
    }
    show({ title: item.title, message: item.artist, actions });
  };

  return (
    <SlideOverModal visible={visible} onRequestClose={onBack}>
      <View style={styles.root}>
        <Svg width="100%" height={HEADER_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="hdr" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={collection.gradient[0]} stopOpacity={0.85} />
              <Stop offset="0.55" stopColor={collection.gradient[1]} stopOpacity={0.35} />
              <Stop offset="1" stopColor={theme.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height={HEADER_H} fill="url(#hdr)" />
        </Svg>

        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.topBar}>
            {selectMode ? (
              <View style={styles.selBar}>
                <TouchableOpacity onPress={exitSelect} hitSlop={12}>
                  <Ic icon={Cancel01Icon} size={22} color={theme.text} />
                </TouchableOpacity>
                <Text style={styles.selCount} numberOfLines={1}>
                  {t('selectedCount', { n: String(selTracks.length) })}
                </Text>
                <TouchableOpacity onPress={selectAll} hitSlop={8}>
                  <Text style={styles.selAll}>{t('selectAll')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={playSelection}
                  hitSlop={8}
                  disabled={!selTracks.length}>
                  <Ic
                    icon={PlayIcon}
                    size={22}
                    color={selTracks.length ? theme.text : theme.textFaint}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={queueSelection}
                  hitSlop={8}
                  disabled={!selTracks.length}>
                  <Ic
                    icon={Queue01Icon}
                    size={22}
                    color={selTracks.length ? theme.text : theme.textFaint}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => selTracks.length && setAddTracks(selTracks)}
                  hitSlop={8}
                  disabled={!selTracks.length}>
                  <Ic
                    icon={Add01Icon}
                    size={22}
                    color={selTracks.length ? theme.text : theme.textFaint}
                  />
                </TouchableOpacity>
                {collection.kind === 'playlist' && collection.playlistId && (
                  <TouchableOpacity
                    onPress={removeSelectionFromPlaylist}
                    hitSlop={8}
                    disabled={!selTracks.length}>
                    <Ic
                      icon={RemoveCircleIcon}
                      size={22}
                      color={selTracks.length ? '#ff6b6b' : theme.textFaint}
                    />
                  </TouchableOpacity>
                )}
                {selTracks.some(tk => downloadedIds.has(tk.id)) && (
                  <TouchableOpacity onPress={deleteSelection} hitSlop={8}>
                    <Ic icon={Delete02Icon} size={22} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity onPress={onBack} hitSlop={12}>
                <Ic icon={ArrowLeft01Icon} size={26} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={displayTracks}
            keyExtractor={(t, i) => t.id + '_' + i}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              searching ? (
                <View style={styles.searchHeader}>
                  <View style={styles.searchInputWrap}>
                    <Ic icon={Search01Icon} size={18} color={theme.textDim} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('searchIn', { name: collection.title })}
                      placeholderTextColor={theme.textFaint}
                      value={query}
                      onChangeText={setQuery}
                      autoFocus
                    />
                    {query.length > 0 && (
                      <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                        <Ic icon={Cancel01Icon} size={16} color={theme.textDim} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSearching(false);
                      setQuery('');
                    }}
                    hitSlop={8}>
                    <Text style={styles.cancel}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.headerContent}>
                  {collection.cover ? (
                    <TrackArt uri={collection.cover} style={styles.cover} iconSize={66} />
                  ) : (
                    <GradientTile colors={collection.gradient} size={150} radius={16}>
                      <Ic icon={collection.icon} size={66} color="#fff" strokeWidth={2} />
                    </GradientTile>
                  )}
                  <Text style={styles.title}>{collection.title}</Text>
                  <Text style={styles.subtitle}>{collection.subtitle}</Text>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.searchPill}
                      activeOpacity={0.7}
                      onPress={() => setSearching(true)}>
                      <Ic icon={Search01Icon} size={18} color={theme.textDim} />
                      <Text style={styles.searchPillText}>{t('search')}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionsRight}>
                      <TouchableOpacity
                        style={styles.shuffle}
                        onPress={shufflePlay}
                        disabled={tracks.length === 0}>
                        <Ic
                          icon={ShuffleIcon}
                          size={22}
                          color={
                            !tracks.length
                              ? theme.textFaint
                              : shuffleOn
                              ? theme.accent
                              : theme.text
                          }
                          strokeWidth={shuffleOn ? 2.6 : 1.9}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.playBtn}
                        onPress={() => tracks.length && playTracks(tracks, 0)}
                        disabled={tracks.length === 0}>
                        <Ic icon={PlayIcon} size={28} color="#1a1020" strokeWidth={2.6} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )
            }
            extraData={selectedIds}
            renderItem={({ item, index }) => (
              <TrackRow
                track={item}
                number={
                  collection.numbered ? item.trackNumber ?? index + 1 : undefined
                }
                selectMode={selectMode}
                selected={selectMode && selectedIds!.has(item.id)}
                onPress={() => {
                  if (selectMode) {
                    toggleSelect(item);
                    return;
                  }
                  const idx = tracks.findIndex(t => t.id === item.id);
                  playTracks(tracks, Math.max(idx, 0));
                }}
                onLongPress={() =>
                  selectMode ? toggleSelect(item) : enterSelect(item)
                }
                onMore={selectMode ? undefined : () => openMenu(item)}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {collection.kind === 'liked'
                  ? t('emptyLiked')
                  : collection.kind === 'youtube'
                  ? t('emptyYoutube')
                  : collection.kind === 'playlist'
                  ? t('emptyPlaylist')
                  : t('emptyLocal')}
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 28 }}
          />
          <PlayerBar onPress={() => onOpenNowPlaying?.()} />
        </SafeAreaView>

        <AddToPlaylistSheet
          track={null}
          tracks={addTracks}
          onClose={() => {
            setAddTracks(null);
            exitSelect();
          }}
        />
      </View>
    </SlideOverModal>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  fallback: { flex: 1, backgroundColor: theme.bg },
  backFloating: { position: 'absolute', top: 50, left: 16 },
  topBar: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 },
  selBar: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  selCount: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '700' },
  selAll: { color: theme.accent, fontSize: 13, fontWeight: '700' },
  headerContent: { alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  cover: { width: 170, height: 170, borderRadius: 12, backgroundColor: theme.surfaceHi },
  title: { color: theme.text, fontSize: 26, fontWeight: '900', marginTop: 18, textAlign: 'center', paddingHorizontal: 24 },
  subtitle: { color: theme.textDim, fontSize: 13, marginTop: 8 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    marginTop: 18,
  },
  actionsRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  searchPillText: { color: theme.textDim, fontSize: 14, fontWeight: '600' },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: theme.text, fontSize: 15, padding: 0 },
  cancel: { color: theme.accent, fontSize: 14, fontWeight: '700' },
  shuffle: { padding: 6 },
  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: theme.textFaint, fontSize: 13, textAlign: 'center', marginTop: 30, paddingHorizontal: 24 },
});
