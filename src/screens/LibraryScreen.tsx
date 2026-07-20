import { Add01Icon, Delete02Icon, PlayIcon } from '@hugeicons/core-free-icons';
import React, { useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useActionSheet } from '../components/ActionSheet';
import { useConfirm } from '../components/ConfirmSheet';
import CollectionRow from '../components/CollectionRow';
import Ic from '../components/Ic';
import SwipeableSheet from '../components/SwipeableSheet';
import { buildCollections, Collection } from '../lib/collections';
import { playTracks } from '../lib/player';
import { useLibrary } from '../store/library';
import { theme } from '../theme';

type Props = {
  onOpen: (c: Collection) => void;
};

const FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'albums', label: 'Albums' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'youtube', label: 'Youtube' },
  { key: 'local', label: 'Local' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function LibraryScreen({ onOpen }: Props) {
  const lib = useLibrary();
  const { createPlaylist, deletePlaylist, removeAlbum } = lib;
  const { show } = useActionSheet();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const collections = buildCollections(lib).filter(c => {
    if (filter === 'all') return true;
    if (filter === 'albums') return c.kind === 'album';
    if (filter === 'playlists') return c.kind === 'liked' || c.kind === 'playlist';
    return c.kind === filter;
  });

  const onMore = (c: Collection) => {
    if (c.kind === 'playlist' && c.playlistId) {
      show({
        title: c.title,
        actions: [
          {
            label: 'Jouer la playlist',
            icon: PlayIcon,
            onPress: () => c.tracks.length && playTracks(c.tracks, 0),
          },
          {
            label: 'Supprimer la playlist',
            icon: Delete02Icon,
            destructive: true,
            onPress: () =>
              confirm({
                title: 'Supprimer la playlist ?',
                message: `« ${c.title} » sera définitivement supprimée.`,
                confirmLabel: 'Supprimer',
                destructive: true,
                onConfirm: () => deletePlaylist(c.playlistId!),
              }),
          },
        ],
      });
    } else if (c.kind === 'album') {
      const albumId = c.key.replace(/^album:/, '');
      show({
        title: c.title,
        message: c.subtitle,
        actions: [
          {
            label: "Jouer l'album",
            icon: PlayIcon,
            onPress: () => c.tracks.length && playTracks(c.tracks, 0),
          },
          {
            label: "Supprimer l'album",
            icon: Delete02Icon,
            destructive: true,
            onPress: () =>
              confirm({
                title: "Supprimer l'album ?",
                message: `« ${c.title} » et ses titres téléchargés seront supprimés.`,
                confirmLabel: 'Supprimer',
                destructive: true,
                onConfirm: () => removeAlbum(albumId),
              }),
          },
        ],
      });
    }
  };

  const handleCreate = () => {
    if (newName.trim()) createPlaylist(newName);
    setNewName('');
    setNewOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bibliothèque</Text>
        <TouchableOpacity onPress={() => setNewOpen(true)} hitSlop={10}>
          <Ic icon={Add01Icon} size={26} color={theme.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={collections}
        keyExtractor={c => c.key}
        ListHeaderComponent={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}>
            {FILTERS.map(f => {
              const on = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setFilter(f.key)}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        }
        renderItem={({ item }) => {
          const hasMenu = item.kind === 'playlist' || item.kind === 'album';
          return (
            <CollectionRow
              collection={item}
              onPress={() => onOpen(item)}
              onMore={hasMenu ? () => onMore(item) : undefined}
              onLongPress={hasMenu ? () => onMore(item) : undefined}
            />
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <SwipeableSheet visible={newOpen} onClose={() => setNewOpen(false)}>
        <View style={styles.sheetBody}>
          <Text style={styles.modalTitle}>Nouvelle playlist</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom de la playlist"
            placeholderTextColor={theme.textFaint}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity style={styles.modalBtn} onPress={handleCreate}>
            <Text style={styles.modalBtnText}>Créer</Text>
          </TouchableOpacity>
        </View>
      </SwipeableSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: { color: theme.text, fontSize: 26, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.surface,
  },
  chipOn: { backgroundColor: theme.accent },
  chipText: { color: theme.textDim, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#1a1020', fontWeight: '700' },
  sheetBody: { paddingHorizontal: 18, paddingTop: 4 },
  modalTitle: { color: theme.text, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  input: {
    backgroundColor: theme.surfaceHi,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalBtn: {
    backgroundColor: theme.accent,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  modalBtnText: { color: '#1a1020', fontWeight: '800', fontSize: 15 },
});
