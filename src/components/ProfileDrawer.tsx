import {
  ChartHistogramIcon,
  Clock01Icon,
  Login01Icon,
  PaintBoardIcon,
  Settings01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../theme';
import Ic from './Ic';

export type DrawerItemKey = 'connect' | 'recents' | 'settings' | 'playerStyles' | 'stats';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: DrawerItemKey) => void;
};

const WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);

const ITEMS: { key: DrawerItemKey; label: string; icon: any }[] = [
  { key: 'connect', label: 'Se connecter', icon: Login01Icon },
  { key: 'recents', label: 'Récents', icon: Clock01Icon },
  { key: 'settings', label: 'Réglages', icon: Settings01Icon },
  { key: 'playerStyles', label: 'Styles du lecteur', icon: PaintBoardIcon },
  { key: 'stats', label: "Statistiques d'écoute", icon: ChartHistogramIcon },
];

/** Panneau de profil qui glisse depuis la gauche. */
export default function ProfileDrawer({ visible, onClose, onSelect }: Props) {
  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(-WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, { toValue: -WIDTH, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.panel, { transform: [{ translateX: slide }] }]}>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Ic icon={UserCircleIcon} size={38} color={theme.textDim} strokeWidth={1.6} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.name}>Invité</Text>
              <Text style={styles.sub}>Non connecté</Text>
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
              <Text style={styles.itemLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: WIDTH,
    backgroundColor: theme.bg2,
    borderRightWidth: 1,
    borderRightColor: theme.border,
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
