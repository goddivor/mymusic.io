import {
  ChartHistogramIcon,
  Clock01Icon,
  Login01Icon,
  PaintBoardIcon,
  Settings01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useI18n } from '../i18n';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import Ic from './Ic';
import WebAccessCard from './WebAccessCard';

export type DrawerItemKey = 'connect' | 'recents' | 'settings' | 'playerStyles' | 'stats';

type Props = {
  onSelect: (key: DrawerItemKey) => void;
};

const ITEMS = [
  { key: 'connect', labelKey: 'signIn', icon: Login01Icon },
  { key: 'recents', labelKey: 'recents', icon: Clock01Icon },
  { key: 'settings', labelKey: 'settings', icon: Settings01Icon },
  { key: 'playerStyles', labelKey: 'playerStyles', icon: PaintBoardIcon },
  { key: 'stats', labelKey: 'listeningStats', icon: ChartHistogramIcon },
] as const;

/** Contenu du panneau latéral (affiché par DrawerLayout). */
export default function ProfileDrawer({ onSelect }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <ScrollView
      style={styles.panel}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Ic icon={UserCircleIcon} size={38} color={theme.textDim} strokeWidth={1.6} />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.name}>{t('guest')}</Text>
          <Text style={styles.sub}>{t('notConnected')}</Text>
        </View>
      </View>

      <View style={styles.sep} />

      {ITEMS.map(item => (
        <TouchableOpacity
          key={item.key}
          style={styles.item}
          activeOpacity={0.7}
          onPress={() => onSelect(item.key)}>
          <Ic icon={item.icon} size={22} color={theme.textDim} strokeWidth={1.9} />
          <Text style={styles.itemLabel}>{t(item.labelKey)}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.sep} />
      <WebAccessCard />
    </ScrollView>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  panel: {
    flex: 1,
    paddingTop: 54,
    paddingHorizontal: 14,
  },
  profile: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: theme.text, fontSize: 17, fontWeight: '800' },
  sub: { color: theme.textFaint, fontSize: 12.5, marginTop: 2 },
  sep: { height: 1, backgroundColor: theme.border, marginVertical: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  itemLabel: { color: theme.text, fontSize: 15, fontWeight: '600', marginLeft: 14 },
});
