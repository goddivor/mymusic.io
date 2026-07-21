import {
  ArrowLeft01Icon,
  MusicNote01Icon,
} from '@hugeicons/core-free-icons';
import React from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
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

/** Historique d'écoute (titres joués récemment, du plus récent au plus ancien). */
export default function RecentsScreen({ visible, onClose }: Props) {
  const lib = useLibrary();
  const tracks = lib.recentIds
    .map(id => lib.tracksById[id])
    .filter(Boolean) as AppTrack[];

  const renderRow = ({ item, index }: { item: AppTrack; index: number }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => playTracks(tracks, index)}>
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
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.back} activeOpacity={0.7}>
            <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Récents</Text>
        </View>

        <FlatList
          data={tracks}
          keyExtractor={t => t.id}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune écoute récente.</Text>
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
  headerTitle: { color: theme.text, fontSize: 19, fontWeight: '800', marginLeft: 6 },
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
  empty: { color: theme.textFaint, fontSize: 13.5, textAlign: 'center', marginTop: 40 },
});
