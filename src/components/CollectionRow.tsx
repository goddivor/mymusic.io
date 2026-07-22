import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Collection } from '../lib/collections';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import GradientTile from './GradientTile';
import Ic from './Ic';

type Props = {
  collection: Collection;
  onPress: () => void;
  onMore?: () => void;
  onLongPress?: () => void;
};

export default function CollectionRow({ collection, onPress, onMore, onLongPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.6}>
      {collection.cover ? (
        <Image source={{ uri: collection.cover }} style={styles.cover} />
      ) : (
        <GradientTile colors={collection.gradient} size={56} radius={12}>
          <Ic icon={collection.icon} size={26} color="#fff" strokeWidth={2.2} />
        </GradientTile>
      )}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {collection.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {collection.subtitle}
        </Text>
      </View>
      {onMore && (
        <TouchableOpacity onPress={onMore} hitSlop={12} style={styles.more}>
          <Ic icon={MoreHorizontalIcon} size={20} color={theme.textDim} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 16 },
  cover: { width: 56, height: 56, borderRadius: 12, backgroundColor: theme.surfaceHi },
  meta: { flex: 1, marginLeft: 14 },
  title: { color: theme.text, fontSize: 16, fontWeight: '600' },
  subtitle: { color: theme.textDim, fontSize: 12.5, marginTop: 3 },
  more: { paddingLeft: 8, paddingVertical: 4 },
});
