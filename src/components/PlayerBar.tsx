import {
  MusicNote01Icon,
  NextIcon,
  PauseIcon,
  PlayIcon,
} from '@hugeicons/core-free-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TrackPlayer, {
  useActiveTrack,
  useIsPlaying,
  useProgress,
} from 'react-native-track-player';
import { theme } from '../theme';
import Ic from './Ic';

export default function PlayerBar({ onPress }: { onPress?: () => void }) {
  const track = useActiveTrack();
  const { playing } = useIsPlaying();
  const { position, duration } = useProgress();

  if (!track) return null;

  const pct = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <TouchableOpacity style={styles.tapArea} activeOpacity={0.7} onPress={onPress}>
          {track.artwork ? (
            <Image source={{ uri: String(track.artwork) }} style={styles.art} />
          ) : (
            <View style={[styles.art, styles.artPlaceholder]}>
              <Ic icon={MusicNote01Icon} size={18} color={theme.textFaint} />
            </View>
          )}
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          style={styles.ctrlBtn}
          onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())}>
          <Ic icon={playing ? PauseIcon : PlayIcon} size={26} color={theme.text} strokeWidth={2.2} />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          style={styles.ctrlBtn}
          onPress={() => TrackPlayer.skipToNext().catch(() => {})}>
          <Ic icon={NextIcon} size={24} color={theme.text} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: theme.surfaceHi,
    overflow: 'hidden',
  },
  bar: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  tapArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  art: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.surface },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, marginHorizontal: 12 },
  title: { color: theme.text, fontSize: 14, fontWeight: '700' },
  artist: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  ctrlBtn: { paddingHorizontal: 8 },
  progressTrack: { height: 3, backgroundColor: theme.surface },
  progressFill: { height: 3, backgroundColor: theme.accent },
});
