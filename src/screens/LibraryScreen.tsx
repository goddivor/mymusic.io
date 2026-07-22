import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Folder01Icon,
  FolderAddIcon,
  PlayIcon,
  Playlist03Icon,
  RemoveCircleIcon,
  Search01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActionSheet } from '../components/ActionSheet';
import { useConfirm } from '../components/ConfirmSheet';
import CollectionRow from '../components/CollectionRow';
import Ic from '../components/Ic';
import SwipeableSheet from '../components/SwipeableSheet';
import { buildCollections, Collection } from '../lib/collections';
import { useI18n } from '../i18n';
import { playTracks } from '../lib/player';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette, playlistGradient } from '../theme';

type Props = {
  onOpen: (c: Collection) => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
};

const FILTERS = [
  { key: 'all', labelKey: 'filterAll' },
  { key: 'albums', labelKey: 'filterAlbums' },
  { key: 'playlists', labelKey: 'filterPlaylists' },
  { key: 'youtube', labelKey: 'filterYoutube' },
  { key: 'local', labelKey: 'filterLocal' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

type CreateKind = 'playlist' | 'folder';

export default function LibraryScreen({ onOpen, onOpenProfile, onOpenSearch }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, playlistsCount } = useI18n();
  const lib = useLibrary();
  const {
    createPlaylist,
    deletePlaylist,
    removeAlbum,
    folders,
    createFolder,
    deleteFolder,
    addPlaylistToFolder,
    removePlaylistFromFolder,
  } = lib;
  const { show } = useActionSheet();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [newName, setNewName] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const allCollections = buildCollections(lib);
  const folderedPlaylistIds = new Set(folders.flatMap(f => f.playlistIds));

  const folderToCollection = (f: (typeof folders)[number]): Collection => ({
    key: 'folder:' + f.id,
    title: f.name,
    subtitle: `${t('folder')} · ${playlistsCount(f.playlistIds.length)}`,
    kind: 'folder',
    tracks: [],
    gradient: playlistGradient(f.id + f.name),
    icon: Folder01Icon,
  });

  const showFolders = filter === 'all' || filter === 'playlists';
  const listed: Collection[] = [
    ...allCollections.filter(c => {
      if (c.kind === 'playlist' && c.playlistId && folderedPlaylistIds.has(c.playlistId)) {
        return false;
      }
      if (filter === 'all') return true;
      if (filter === 'albums') return c.kind === 'album';
      if (filter === 'playlists') return c.kind === 'liked' || c.kind === 'playlist';
      return c.kind === filter;
    }),
    ...(showFolders ? folders.map(folderToCollection) : []),
  ];

  const openFolder = folders.find(f => f.id === openFolderId) ?? null;
  const folderPlaylists = openFolder
    ? (openFolder.playlistIds
        .map(pid => allCollections.find(c => c.playlistId === pid))
        .filter(Boolean) as Collection[])
    : [];

  const pickCreate = () =>
    show({
      title: t('create'),
      actions: [
        {
          label: t('newPlaylist'),
          icon: Playlist03Icon,
          onPress: () => setCreateKind('playlist'),
        },
        {
          label: t('newFolder'),
          icon: FolderAddIcon,
          onPress: () => setCreateKind('folder'),
        },
      ],
    });

  const pickFolderFor = (playlistId: string) =>
    show({
      title: t('moveToFolder'),
      actions: folders.map(f => ({
        label: f.name,
        icon: Folder01Icon,
        onPress: () => addPlaylistToFolder(f.id, playlistId),
      })),
    });

  const onMorePlaylist = (c: Collection, insideFolder: boolean) => {
    const pid = c.playlistId!;
    const actions = [
      {
        label: t('playPlaylist'),
        icon: PlayIcon,
        onPress: () => c.tracks.length && playTracks(c.tracks, 0),
      },
    ] as any[];
    if (insideFolder) {
      actions.push({
        label: t('removeFromFolder'),
        icon: RemoveCircleIcon,
        onPress: () => removePlaylistFromFolder(pid),
      });
    } else if (folders.length > 0) {
      actions.push({
        label: t('moveToFolder'),
        icon: Folder01Icon,
        onPress: () => pickFolderFor(pid),
      });
    }
    actions.push({
      label: t('deletePlaylist'),
      icon: Delete02Icon,
      destructive: true,
      onPress: () =>
        confirm({
          title: t('deletePlaylistQ'),
          message: t('deletePlaylistMsg', { name: c.title }),
          confirmLabel: t('delete'),
          destructive: true,
          onConfirm: () => deletePlaylist(pid),
        }),
    });
    show({ title: c.title, actions });
  };

  const onMore = (c: Collection) => {
    if (c.kind === 'playlist' && c.playlistId) {
      onMorePlaylist(c, false);
    } else if (c.kind === 'folder') {
      const folderId = c.key.replace(/^folder:/, '');
      show({
        title: c.title,
        message: c.subtitle,
        actions: [
          {
            label: t('deleteFolder'),
            icon: Delete02Icon,
            destructive: true,
            onPress: () =>
              confirm({
                title: t('deleteFolderQ'),
                message: t('deleteFolderMsg', { name: c.title }),
                confirmLabel: t('delete'),
                destructive: true,
                onConfirm: () => {
                  if (openFolderId === folderId) setOpenFolderId(null);
                  deleteFolder(folderId);
                },
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
            label: t('playAlbum'),
            icon: PlayIcon,
            onPress: () => c.tracks.length && playTracks(c.tracks, 0),
          },
          {
            label: t('deleteAlbum'),
            icon: Delete02Icon,
            destructive: true,
            onPress: () =>
              confirm({
                title: t('deleteAlbumQ'),
                message: t('deleteAlbumMsg', { name: c.title }),
                confirmLabel: t('delete'),
                destructive: true,
                onConfirm: () => removeAlbum(albumId),
              }),
          },
        ],
      });
    }
  };

  const handleCreate = () => {
    if (newName.trim()) {
      if (createKind === 'folder') createFolder(newName);
      else createPlaylist(newName);
    }
    setNewName('');
    setCreateKind(null);
  };

  const onRowPress = (c: Collection) => {
    if (c.kind === 'folder') setOpenFolderId(c.key.replace(/^folder:/, ''));
    else onOpen(c);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.avatar}
            activeOpacity={0.7}
            onPress={onOpenProfile}>
            <Ic icon={UserCircleIcon} size={26} color={theme.textDim} strokeWidth={1.7} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('tabLibrary')}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onOpenSearch} hitSlop={10}>
            <Ic icon={Search01Icon} size={24} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickCreate} hitSlop={10}>
            <Ic icon={Add01Icon} size={26} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={listed}
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
                    {t(f.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        }
        renderItem={({ item }) => {
          const hasMenu =
            item.kind === 'playlist' || item.kind === 'album' || item.kind === 'folder';
          return (
            <CollectionRow
              collection={item}
              onPress={() => onRowPress(item)}
              onMore={hasMenu ? () => onMore(item) : undefined}
              onLongPress={hasMenu ? () => onMore(item) : undefined}
            />
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <SwipeableSheet visible={createKind !== null} onClose={() => setCreateKind(null)}>
        <View style={styles.sheetBody}>
          <Text style={styles.modalTitle}>
            {createKind === 'folder' ? t('newFolder') : t('newPlaylist')}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={createKind === 'folder' ? t('folderName') : t('playlistName')}
            placeholderTextColor={theme.textFaint}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity style={styles.modalBtn} onPress={handleCreate}>
            <Text style={styles.modalBtnText}>{t('create')}</Text>
          </TouchableOpacity>
        </View>
      </SwipeableSheet>

      <Modal
        visible={openFolder !== null}
        animationType="slide"
        onRequestClose={() => setOpenFolderId(null)}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.folderHeader}>
            <TouchableOpacity
              onPress={() => setOpenFolderId(null)}
              hitSlop={10}
              style={styles.folderBack}>
              <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
            </TouchableOpacity>
            <Ic icon={Folder01Icon} size={22} color={theme.accent} strokeWidth={2} />
            <Text style={styles.folderTitle} numberOfLines={1}>
              {openFolder?.name}
            </Text>
          </View>

          <FlatList
            data={folderPlaylists}
            keyExtractor={c => c.key}
            renderItem={({ item }) => (
              <CollectionRow
                collection={item}
                onPress={() => onOpen(item)}
                onMore={() => onMorePlaylist(item, true)}
                onLongPress={() => onMorePlaylist(item, true)}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.folderEmpty}>{t('folderEmpty')}</Text>
            }
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
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
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
  },
  folderBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderTitle: { color: theme.text, fontSize: 19, fontWeight: '800', flex: 1 },
  folderEmpty: {
    color: theme.textFaint,
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 32,
  },
});
