import {
  Add01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
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
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useActionSheet } from '../components/ActionSheet';
import { useConfirm } from '../components/ConfirmSheet';
import GradientTile from '../components/GradientTile';
import Ic from '../components/Ic';
import PlayerBar from '../components/PlayerBar';
import TrackRow from '../components/TrackRow';
import { buildCollections } from '../lib/collections';
import { playNext, playTracks } from '../lib/player';
import { useLibrary } from '../store/library';
import { theme } from '../theme';
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
  const lib = useLibrary();
  const { isLiked, toggleLike, removeYoutube, removeFromPlaylist } = lib;
  const { show } = useActionSheet();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const visible = collectionKey !== null;

  useEffect(() => {
    if (!visible) {
      setSearching(false);
      setQuery('');
    }
  }, [visible, collectionKey]);
  const collection = collectionKey
    ? buildCollections(lib).find(c => c.key === collectionKey) ?? null
    : null;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [visible, onBack]);

  if (!collection) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onBack}>
        <View style={styles.fallback}>
          <TouchableOpacity onPress={onBack} style={styles.backFloating} hitSlop={12}>
            <Ic icon={ArrowLeft01Icon} size={26} color={theme.text} />
          </TouchableOpacity>
        </View>
      </Modal>
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
    if (tracks.length) playTracks(tracks, 0, { shuffle: true });
  };

  const openMenu = (item: AppTrack) => {
    const liked = isLiked(item.id);
    const actions = [
      {
        label: liked ? 'Retirer des likes' : 'Liker',
        icon: FavouriteIcon,
        onPress: () => toggleLike(item),
      },
      {
        label: 'Lire ensuite',
        icon: Queue01Icon,
        onPress: () => playNext(item),
      },
      {
        label: 'Ajouter à une playlist',
        icon: Add01Icon,
        onPress: () => onAddToPlaylist(item),
      },
    ];
    if (collection.kind === 'youtube' || collection.kind === 'album') {
      actions.push({
        label: 'Supprimer le téléchargement',
        icon: Delete02Icon,
        destructive: true,
        onPress: () =>
          confirm({
            title: 'Supprimer le téléchargement ?',
            message: `« ${item.title} » sera supprimé de l'appareil.`,
            confirmLabel: 'Supprimer',
            destructive: true,
            onConfirm: () => removeYoutube(item.id),
          }),
      } as any);
    }
    if (collection.kind === 'playlist' && collection.playlistId) {
      const pid = collection.playlistId;
      actions.push({
        label: 'Retirer de la playlist',
        icon: RemoveCircleIcon,
        destructive: true,
        onPress: () =>
          confirm({
            title: 'Retirer de la playlist ?',
            message: `« ${item.title} » sera retiré de « ${collection.title} ».`,
            confirmLabel: 'Retirer',
            destructive: true,
            onConfirm: () => removeFromPlaylist(pid, item.id),
          }),
      } as any);
    }
    show({ title: item.title, message: item.artist, actions });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack}>
      <View style={styles.root}>
        {/* Colored gradient backdrop behind the header */}
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
            <TouchableOpacity onPress={onBack} hitSlop={12}>
              <Ic icon={ArrowLeft01Icon} size={26} color={theme.text} />
            </TouchableOpacity>
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
                      placeholder={`Rechercher dans « ${collection.title} »`}
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
                    <Text style={styles.cancel}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.headerContent}>
                  {collection.cover ? (
                    <Image source={{ uri: collection.cover }} style={styles.cover} />
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
                      <Text style={styles.searchPillText}>Rechercher</Text>
                    </TouchableOpacity>
                    <View style={styles.actionsRight}>
                      <TouchableOpacity
                        style={styles.shuffle}
                        onPress={shufflePlay}
                        disabled={tracks.length === 0}>
                        <Ic
                          icon={ShuffleIcon}
                          size={22}
                          color={tracks.length ? theme.text : theme.textFaint}
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
            renderItem={({ item, index }) => (
              <TrackRow
                track={item}
                number={
                  collection.numbered ? item.trackNumber ?? index + 1 : undefined
                }
                onPress={() => {
                  const idx = tracks.findIndex(t => t.id === item.id);
                  playTracks(tracks, Math.max(idx, 0));
                }}
                onMore={() => openMenu(item)}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {collection.kind === 'liked'
                  ? 'Aucun titre liké pour l’instant.'
                  : collection.kind === 'youtube'
                  ? 'Aucun téléchargement. Va dans l’onglet YouTube.'
                  : collection.kind === 'playlist'
                  ? 'Playlist vide. Ajoute des titres via ⋯.'
                  : 'Aucun fichier audio trouvé.'}
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 28 }}
          />
          <PlayerBar onPress={() => onOpenNowPlaying?.()} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  fallback: { flex: 1, backgroundColor: theme.bg },
  backFloating: { position: 'absolute', top: 50, left: 16 },
  topBar: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 },
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
