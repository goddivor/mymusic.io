import { DownloadCircle01Icon } from '@hugeicons/core-free-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { t } from '../i18n';
import { YtVideoItem } from '../lib/ytExtractor';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import Ic from './Ic';

export function fmtCount(n: number): string {
  if (!n || n < 0) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' Md';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + ' k';
  return String(Math.round(n));
}

export function fmtDuration(sec: number): string {
  if (!sec || sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return (h > 0 ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
}

type Props = {
  item: YtVideoItem;
  onPress: () => void;
  onDownload?: () => void;
};

export default function YtVideoRow({ item, onPress, onDownload }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = [
    item.uploader,
    item.views > 0 ? t('viewsCount', { n: fmtCount(item.views) }) : '',
    item.uploadedDate,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.thumbWrap}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        {item.duration > 0 && (
          <View style={styles.durBadge}>
            <Text style={styles.durText}>{fmtDuration(item.duration)}</Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {meta}
        </Text>
      </View>
      {onDownload && (
        <TouchableOpacity onPress={onDownload} hitSlop={10} style={styles.dl}>
          <Ic icon={DownloadCircle01Icon} size={22} color={theme.textDim} strokeWidth={1.9} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  thumbWrap: { width: 148, height: 83 },
  thumb: {
    width: 148,
    height: 83,
    borderRadius: 10,
    backgroundColor: theme.surfaceHi,
  },
  thumbPlaceholder: {},
  durBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  durText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  meta: { flex: 1, marginLeft: 10 },
  title: { color: theme.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  sub: { color: theme.textDim, fontSize: 12, marginTop: 4, lineHeight: 16 },
  dl: { paddingLeft: 8, paddingVertical: 6 },
});
