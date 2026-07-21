import { Add01Icon, FavouriteIcon, Playlist03Icon } from '@hugeicons/core-free-icons';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useI18n } from '../i18n';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { gradients, Palette, playlistGradient } from '../theme';
import { AppTrack } from '../types';
import GradientTile from './GradientTile';
import Ic from './Ic';
import SwipeableSheet from './SwipeableSheet';

type Props = {
  track: AppTrack | null;
  onClose: () => void;
};

export default function AddToPlaylistSheet({ track, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, tracksCount } = useI18n();
  const { playlists, createPlaylist, addToPlaylist, isLiked, toggleLike } = useLibrary();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const visible = track !== null;
  const liked = track ? isLiked(track.id) : false;

  const close = () => {
    setCreating(false);
    setName('');
    onClose();
  };

  const handlePick = (playlistId: string) => {
    if (track) addToPlaylist(playlistId, track.id);
    close();
  };

  const handleToggleLiked = () => {
    if (track) toggleLike(track);
    close();
  };

  const handleCreate = () => {
    if (!name.trim() || !track) return;
    const id = createPlaylist(name);
    addToPlaylist(id, track.id);
    close();
  };

  return (
    <SwipeableSheet visible={visible} onClose={close}>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {t('addTrackTitle', { title: track?.title ?? '' })}
        </Text>

        {/* Titres likés est une playlist à part entière → toujours en premier */}
        <TouchableOpacity style={styles.row} onPress={handleToggleLiked}>
          <GradientTile colors={gradients.liked} size={44} radius={9}>
            <Ic icon={FavouriteIcon} size={20} color="#fff" strokeWidth={2.2} />
          </GradientTile>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowName} numberOfLines={1}>
              {t('likedTracks')}
            </Text>
            <Text style={styles.rowCount}>{liked ? t('alreadyAddedRemove') : t('addToLikes')}</Text>
          </View>
          {liked && <Text style={styles.added}>✓</Text>}
        </TouchableOpacity>

        {creating ? (
          <View style={styles.createRow}>
            <TextInput
              style={styles.input}
              placeholder={t('playlistName')}
              placeholderTextColor={theme.textFaint}
              value={name}
              onChangeText={setName}
              autoFocus
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
              <Text style={styles.createBtnText}>{t('create')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.newRow} onPress={() => setCreating(true)}>
            <View style={styles.newIcon}>
              <Ic icon={Add01Icon} size={24} color={theme.accent} strokeWidth={2.2} />
            </View>
            <Text style={styles.newText}>{t('newPlaylist')}</Text>
          </TouchableOpacity>
        )}

        <FlatList
          data={playlists}
          keyExtractor={p => p.id}
          style={{ maxHeight: 320 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handlePick(item.id)}>
              <GradientTile colors={playlistGradient(item.id + item.name)} size={44} radius={9}>
                <Ic icon={Playlist03Icon} size={20} color="#fff" strokeWidth={2.2} />
              </GradientTile>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowCount}>{tracksCount(item.trackIds.length)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </SwipeableSheet>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
  title: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  newRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  newIcon: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: theme.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newText: { color: theme.accent, fontSize: 15, fontWeight: '700', marginLeft: 12 },
  createRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  input: {
    flex: 1,
    backgroundColor: theme.surfaceHi,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  createBtn: {
    marginLeft: 10,
    backgroundColor: theme.accent,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  createBtnText: { color: '#1a1020', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowName: { color: theme.text, fontSize: 15, fontWeight: '500' },
  rowCount: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  added: { color: theme.accent, fontSize: 18, fontWeight: '800', marginLeft: 8 },
});
