import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import React from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Download, useLibrary } from '../store/library';
import { theme } from '../theme';
import Ic from './Ic';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function statusLabel(d: Download): string {
  switch (d.status) {
    case 'extracting':
      return 'Extraction…';
    case 'downloading':
      return `Téléchargement ${Math.round(d.progress * 100)}%`;
    case 'done':
      return 'Terminé';
    case 'error':
      return d.error ?? 'Erreur';
  }
}

export default function DownloadsSheet({ visible, onClose }: Props) {
  const { downloads, clearFinishedDownloads } = useLibrary();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Téléchargements</Text>
          {downloads.some(d => d.status === 'done' || d.status === 'error') && (
            <TouchableOpacity onPress={clearFinishedDownloads} hitSlop={8}>
              <Text style={styles.clear}>Effacer terminés</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={downloads}
          keyExtractor={d => d.id}
          style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.artwork ? (
                <Image source={{ uri: item.artwork }} style={styles.art} />
              ) : (
                <View style={[styles.art, styles.placeholder]} />
              )}
              <View style={styles.meta}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.status,
                    item.status === 'error' && { color: '#ff6b6b' },
                    item.status === 'done' && { color: theme.accent },
                  ]}>
                  {statusLabel(item)}
                </Text>
                {(item.status === 'downloading' || item.status === 'extracting') && (
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${
                            item.status === 'extracting' ? 8 : item.progress * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
              <View style={styles.statusIcon}>
                {item.status === 'done' && (
                  <Ic icon={CheckmarkCircle02Icon} size={22} color={theme.accent} />
                )}
                {item.status === 'error' && (
                  <Ic icon={Alert02Icon} size={22} color="#ff6b6b" />
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ic icon={Cancel01Icon} size={26} color={theme.textFaint} />
              <Text style={styles.emptyText}>Aucun téléchargement</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 30,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: theme.text, fontSize: 18, fontWeight: '800' },
  clear: { color: theme.textDim, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  art: { width: 46, height: 46, borderRadius: 8, backgroundColor: theme.surfaceHi },
  placeholder: { backgroundColor: theme.surfaceHi },
  meta: { flex: 1, marginLeft: 12 },
  rowTitle: { color: theme.text, fontSize: 14.5, fontWeight: '500' },
  status: { color: theme.textDim, fontSize: 12, marginTop: 3 },
  progressTrack: {
    height: 3,
    backgroundColor: theme.surfaceHi,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: { height: 3, backgroundColor: theme.accent },
  statusIcon: { marginLeft: 8, width: 24, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: theme.textFaint, fontSize: 13, marginTop: 8 },
});
