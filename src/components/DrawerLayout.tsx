import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useThemedStyles } from '../store/theme';
import { Palette } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
export const DRAWER_WIDTH = Math.min(SCREEN_W * 0.78, 320);
/**
 * Zone de capture du swipe d'ouverture depuis le bord gauche. Large (60 px)
 * car les ~30 premiers px sont mangés par le geste retour système (MIUI &
 * co en navigation gestuelle) : le swipe utile démarre juste après.
 */
const EDGE = 60;

type Props = {
  open: boolean;
  /** Autorise le geste d'ouverture (ex. : seulement sur l'onglet Accueil). */
  gestureEnabled: boolean;
  onOpen: () => void;
  onClose: () => void;
  drawer: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Tiroir « push » à la YouTube Music : le panneau vit sous la page, la page
 * se fait tirer vers la droite pour le révéler. Le geste suit le doigt
 * (setValue) et se termine par un spring, transforms sur le native driver.
 */
export default function DrawerLayout({
  open,
  gestureEnabled,
  onOpen,
  onClose,
  drawer,
  children,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const openRef = useRef(open);
  const enabledRef = useRef(gestureEnabled);

  useEffect(() => {
    openRef.current = open;
    Animated.spring(progress, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 2,
    }).start();
  }, [open, progress]);

  useEffect(() => {
    enabledRef.current = gestureEnabled;
  }, [gestureEnabled]);

  // Bouton retour Android : ferme le tiroir s'il est ouvert.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const settle = (shouldOpen: boolean, velocity?: number) => {
    Animated.spring(progress, {
      toValue: shouldOpen ? 1 : 0,
      velocity,
      useNativeDriver: true,
      speed: 18,
      bounciness: 2,
    }).start();
    if (shouldOpen !== openRef.current) {
      if (shouldOpen) onOpen();
      else onClose();
    }
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_evt, g) => {
        const horizontal = Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
        if (!horizontal) return false;
        if (openRef.current) return g.dx < 0; // fermeture : swipe gauche
        return enabledRef.current && g.x0 <= EDGE && g.dx > 0; // ouverture : bord gauche
      },
      onPanResponderMove: (_evt, g) => {
        const base = openRef.current ? DRAWER_WIDTH : 0;
        const x = Math.max(0, Math.min(DRAWER_WIDTH, base + g.dx));
        progress.setValue(x / DRAWER_WIDTH);
      },
      onPanResponderRelease: (_evt, g) => {
        const base = openRef.current ? DRAWER_WIDTH : 0;
        const x = Math.max(0, Math.min(DRAWER_WIDTH, base + g.dx));
        const shouldOpen =
          g.vx > 0.3 ? true : g.vx < -0.3 ? false : x > DRAWER_WIDTH / 2;
        settle(shouldOpen, g.vx);
      },
      onPanResponderTerminate: () => settle(openRef.current),
    }),
  ).current;

  const pageTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DRAWER_WIDTH],
  });
  // Parallaxe : le panneau finit sa course plus lentement que la page.
  const drawerTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH * 0.35, 0],
  });
  const dim = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });

  return (
    <View style={styles.root} {...pan.panHandlers}>
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: drawerTranslate }] }]}>
        {drawer}
      </Animated.View>

      <Animated.View style={[styles.page, { transform: [{ translateX: pageTranslate }] }]}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]}
        />
        {open && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />}
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg2 },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
  },
  page: {
    flex: 1,
    backgroundColor: theme.bg,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: -4, height: 0 },
  },
  dim: { backgroundColor: '#000' },
});
