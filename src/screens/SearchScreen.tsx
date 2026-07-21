import {
  ArrowLeft01Icon,
  Cancel01Icon,
  MusicNote01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import React, { useMemo, useState } from 'react';
import {
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
import Ic from '../components/Ic';
import { playTracks } from '../lib/player';
import { useLibrary } from '../store/library';
import { theme } from '../theme';
import { AppTrack } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function fmt(s?: number): string {
  if (!s || !isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Recherche plein écran sur toute la bibliothèque (locale + YouTube). */
export default function SearchScreen({ visible, onClose }: Props) {
  const lib = useLibrary();
  const [query, setQuery] = useState('');

  const all = useMemo(
    () => [...lib.youtubeTracks, ...lib.localTracks],
    [lib.youtubeTracks, lib.localTracks],
  );

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return all
      .filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.album ?? '').toLowerCase().includes(q),
      )
      .slice(0, 100);
  }, [q, all]);

  const close = () => {
    setQuery('');
    onClose();
  };

  const renderRow = ({ item, index }: { item: AppTrack; index: number }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => playTracks(results, index)}>
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ic icon={MusicNote01Icon} size={20} color={theme.textFaint} />
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
          {item.album ? ` · ${item.album}` : ''}
        </Text>
      </View>
      <Text style={styles.dur}>{fmt(item.duration)}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={close} style={styles.back} activeOpacity={0.7}>
            <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <Ic icon={Search01Icon} size={18} color={theme.textFaint} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder="Titre, artiste, album…"
              placeholderTextColor={theme.textFaint}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
                <Ic icon={Cancel01Icon} size={18} color={theme.textFaint} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={t => t.id}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {q ? 'Aucun résultat.' : 'Cherche dans toute ta bibliothèque.'}
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  back: { padding: 8 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 22,
    paddingHorizontal: 14,
    marginLeft: 4,
  },
  input: { flex: 1, color: theme.text, fontSize: 15, paddingVertical: 10, marginLeft: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: theme.surfaceHi },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.text, fontSize: 14.5, fontWeight: '600' },
  artist: { color: theme.textDim, fontSize: 12.5, marginTop: 2 },
  dur: { color: theme.textFaint, fontSize: 12, marginLeft: 10 },
  empty: { color: theme.textFaint, fontSize: 13.5, textAlign: 'center', marginTop: 40 },
});
