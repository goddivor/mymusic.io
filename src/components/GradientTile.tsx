import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Gradient } from '../theme';

type Props = {
  colors: Gradient;
  size?: number;
  radius?: number;
  children?: React.ReactNode;
};

// Square tile with a diagonal gradient (drawn in SVG, no extra native dep),
// with optional centered content (an icon).
export default function GradientTile({
  colors,
  size = 56,
  radius = 10,
  children,
}: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={radius} ry={radius} fill="url(#grad)" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
