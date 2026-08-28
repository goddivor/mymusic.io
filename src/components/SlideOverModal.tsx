import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, StyleSheet } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
};

/**
 * Full-screen page that enters from the right and leaves to the right, matching
 * the back arrow that points left. React Native's Modal only animates upward,
 * so the sheet is mounted without animation and driven here; it stays mounted
 * until the exit animation finishes.
 */
export default function SlideOverModal({ visible, onRequestClose, children }: Props) {
  const [mounted, setMounted] = useState(visible);
  const x = useRef(new Animated.Value(visible ? 0 : SCREEN_W)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(x, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(x, {
      toValue: SCREEN_W,
      duration: 210,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, x]);

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: x }] }]}>
        {children}
      </Animated.View>
    </Modal>
  );
}
