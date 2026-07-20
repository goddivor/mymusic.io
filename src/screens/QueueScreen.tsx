import {
  ArrowDown01Icon,
  Cancel01Icon,
  DragDropVerticalIcon,
  VolumeHighIcon,
} from '@hugeicons/core-free-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer, { useActiveTrack } from 'react-native-track-player';
import Ic from '../components/Ic';
import { theme } from '../theme';

type Props = { visible: boolean; onClose: () => void };

type QTrack = { id: string; title: string; artist: string; artwork?: string };

const ROW_H = 64;

export default function QueueScreen({ visible, onClose }: Props) {
  const active = useActiveTrack();
  // `queue` only holds the currently playing track + what's coming next.
  // Already-played tracks are not shown. `baseIndex` maps a local row back to
  // the real RNTP queue index.
  const [queue, setQueue] = useState<QTrack[]>([]);
  const [baseIndex, setBaseIndex] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);

  const panY = useRef(new Animated.Value(0)).current;
  const dragIndexRef = useRef<number | null>(null);

  const reload = useCallback(async () => {
    const q = await TrackPlayer.getQueue();
    const idx = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
    const upcoming = q.slice(idx); // current first, then the rest
    setQueue(
      upcoming.map((t: any) => ({
        id: String(t.id ?? t.url),
        title: t.title ?? 'Titre',
        artist: t.artist ?? '',
        artwork: t.artwork ? String(t.artwork) : undefined,
      })),
    );
    setBaseIndex(idx);
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload, active?.id]);

  const makeResponder = (index: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragIndexRef.current = index;
        setDragging(index);
        panY.setValue(0);
      },
      onPanResponderMove: (_, g) => panY.setValue(g.dy),
      onPanResponderRelease: async (_, g) => {
        const from = dragIndexRef.current ?? index;
        // Local row 0 is the playing track — keep it pinned, only reorder "next".
        const to = Math.max(
          1,
          Math.min(queue.length - 1, from + Math.round(g.dy / ROW_H)),
        );
        setDragging(null);
        dragIndexRef.current = null;
        panY.setValue(0);
        if (from >= 1 && to !== from) {
          try {
            await TrackPlayer.move(baseIndex + from, baseIndex + to);
          } catch {}
          await reload();
        }
      },
      onPanResponderTerminate: () => {
        setDragging(null);
        dragIndexRef.current = null;
        panY.setValue(0);
      },
    });

  const jumpTo = async (localIndex: number) => {
    await TrackPlayer.skip(baseIndex + localIndex);
    await TrackPlayer.play();
    await reload();
  };

  const removeAt = async (localIndex: number) => {
    if (localIndex === 0) return; // don't remove the playing track
    try {
      await TrackPlayer.remove(baseIndex + localIndex);
    } catch {}
    await reload();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ic icon={ArrowDown01Icon} size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>File d'attente</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            scrollEnabled={dragging === null}
            contentContainerStyle={{ paddingBottom: 30 }}>
            {queue.length > 0 && <Text style={styles.sectionLabel}>EN LECTURE</Text>}
            <View>
              {queue.map((t, i) => {
                const isActive = i === 0;
                const isDragged = dragging === i;
                return (
                  <React.Fragment key={t.id + '_' + i}>
                    {i === 1 && <Text style={styles.sectionLabel}>À SUIVRE</Text>}
                    <Animated.View
                      style={[
                        styles.row,
                        isDragged && styles.rowDragged,
                        isDragged && { transform: [{ translateY: panY }], zIndex: 10 },
                      ]}>
                      <TouchableOpacity
                        style={styles.rowMain}
                        activeOpacity={0.6}
                        onPress={() => jumpTo(i)}>
                        {t.artwork ? (
                          <Image source={{ uri: t.artwork }} style={styles.art} />
                        ) : (
                          <View style={[styles.art, styles.placeholder]} />
                        )}
                        <View style={styles.meta}>
                          <Text
                            style={[styles.title, isActive && styles.activeTitle]}
                            numberOfLines={1}>
                            {t.title}
                          </Text>
                          <Text style={styles.artist} numberOfLines={1}>
                            {t.artist}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {isActive ? (
                        <View style={styles.trailing}>
                          <Ic icon={VolumeHighIcon} size={18} color={theme.accent} />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.trailing}
                          hitSlop={8}
                          onPress={() => removeAt(i)}>
                          <Ic icon={Cancel01Icon} size={18} color={theme.textDim} />
                        </TouchableOpacity>
                      )}

                      {isActive ? (
                        <View style={styles.handle} />
                      ) : (
                        <View style={styles.handle} {...makeResponder(i).panHandlers}>
                          <Ic icon={DragDropVerticalIcon} size={22} color={theme.textDim} />
                        </View>
                      )}
                    </Animated.View>
                  </React.Fragment>
                );
              })}
            </View>

            {queue.length <= 1 && (
              <Text style={styles.empty}>Rien d'autre dans la file.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
  sectionLabel: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: theme.bg,
  },
  rowDragged: {
    backgroundColor: theme.surfaceHi,
    borderRadius: 10,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  art: { width: 46, height: 46, borderRadius: 8, backgroundColor: theme.surfaceHi },
  placeholder: { backgroundColor: theme.surfaceHi },
  meta: { flex: 1, marginLeft: 12 },
  title: { color: theme.text, fontSize: 15, fontWeight: '500' },
  activeTitle: { color: theme.accent, fontWeight: '700' },
  artist: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  trailing: { width: 34, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, alignItems: 'center', justifyContent: 'center' },
  empty: { color: theme.textFaint, fontSize: 13, textAlign: 'center', marginTop: 24 },
});
