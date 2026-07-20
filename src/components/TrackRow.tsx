import { FavouriteIcon, MoreHorizontalIcon, MusicNote01Icon, VolumeHighIcon } from '@hugeicons/core-free-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useActiveTrack } from 'react-native-track-player';
import { useLibrary } from '../store/library';
import { theme } from '../theme';
import { AppTrack } from '../types';
import Ic from './Ic';

type Props = {
  track: AppTrack;
  onPress: () => void;
  onMore?: () => void;
  number?: number; // show a track number instead of artwork (album view)
};

export default function TrackRow({ track, onPress, onMore, number }: Props) {
  const active = useActiveTrack();
  const { isLiked } = useLibrary();
  const isActive = active?.id === track.id;
  const liked = isLiked(track.id);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onMore}
      activeOpacity={0.6}>
      {number !== undefined ? (
        <View style={styles.numberCell}>
          <Text style={[styles.number, isActive && styles.activeTitle]}>{number}</Text>
        </View>
      ) : track.artwork ? (
        <Image source={{ uri: track.artwork }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.placeholder]}>
          <Ic icon={MusicNote01Icon} size={20} color={theme.textFaint} />
        </View>
      )}
      <View style={styles.meta}>
        <Text
          style={[styles.title, isActive && styles.activeTitle]}
          numberOfLines={1}>
          {track.title}
        </Text>
        <View style={styles.sub}>
          {liked && (
            <View style={styles.heart}>
              <Ic icon={FavouriteIcon} size={11} color={theme.accent} strokeWidth={2.4} />
            </View>
          )}
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
      </View>
      {isActive && (
        <View style={styles.eq}>
          <Ic icon={VolumeHighIcon} size={16} color={theme.accent} />
        </View>
      )}
      {onMore && (
        <TouchableOpacity onPress={onMore} hitSlop={12} style={styles.more}>
          <Ic icon={MoreHorizontalIcon} size={20} color={theme.textDim} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  art: { width: 50, height: 50, borderRadius: 8, backgroundColor: theme.surfaceHi },
  numberCell: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  number: { color: theme.textDim, fontSize: 16, fontWeight: '600' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, marginLeft: 12 },
  title: { color: theme.text, fontSize: 15, fontWeight: '500' },
  activeTitle: { color: theme.accent, fontWeight: '700' },
  sub: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  heart: { marginRight: 5 },
  artist: { color: theme.textDim, fontSize: 12.5, flexShrink: 1 },
  eq: { marginLeft: 8 },
  more: { paddingLeft: 8, paddingVertical: 4 },
});
