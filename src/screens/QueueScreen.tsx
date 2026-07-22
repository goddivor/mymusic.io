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
import { t as tr, useI18n } from '../i18n';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';

type Props = { visible: boolean; onClose: () => void };

type QTrack = { id: string; title: string; artist: string; artwork?: string };

const ROW_H = 64;

export default function QueueScreen({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const active = useActiveTrack();
  const [queue, setQueue] = useState<QTrack[]>([]);
  const [baseIndex, setBaseIndex] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);

  const panY = useRef(new Animated.Value(0)).current;
  const dragIndexRef = useRef<number | null>(null);

  // Rebuilds the local queue view: only the playing track and what comes next
  // are shown (already-played tracks are hidden). `baseIndex` maps a local row
  // back to its real index in the RNTP queue.
  const reload = useCallback(async () => {
    const q = await TrackPlayer.getQueue();
    const idx = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
    const upcoming = q.slice(idx);
    setQueue(
      upcoming.map((t: any) => ({
        id: String(t.id ?? t.url),
        title: t.title ?? tr('track'),
        artist: t.artist ?? '',
        artwork: t.artwork ? String(t.artwork) : undefined,
      })),
    );
    setBaseIndex(idx);
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload, active?.id]);

  // Drag-reorder responder for a queue row: tracks the vertical drag, then on
  // release converts the displacement into a target row (clamped so row 0, the
  // playing track, stays pinned) and moves the track in the RNTP queue.
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
    if (localIndex === 0) return;
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
            <Text style={styles.headerTitle}>{t('queue')}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            scrollEnabled={dragging === null}
            contentContainerStyle={{ paddingBottom: 30 }}>
            {queue.length > 0 && <Text style={styles.sectionLabel}>{t('nowPlaying')}</Text>}
            <View>
              {queue.map((tk, i) => {
                const isActive = i === 0;
                const isDragged = dragging === i;
                return (
                  <React.Fragment key={tk.id + '_' + i}>
                    {i === 1 && <Text style={styles.sectionLabel}>{t('upNext')}</Text>}
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
                        {tk.artwork ? (
                          <Image source={{ uri: tk.artwork }} style={styles.art} />
                        ) : (
                          <View style={[styles.art, styles.placeholder]} />
                        )}
                        <View style={styles.meta}>
                          <Text
                            style={[styles.title, isActive && styles.activeTitle]}
                            numberOfLines={1}>
                            {tk.title}
                          </Text>
                          <Text style={styles.artist} numberOfLines={1}>
                            {tk.artist}
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
              <Text style={styles.empty}>{t('queueEmpty')}</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
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
