import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { useTheme } from '../store/theme';

type Props = {
  icon: any;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Thin wrapper around HugeIcons to enforce consistent defaults app-wide.
// Accepte aussi un composant React (ex. BrandYoutubeIcon) à la place d'une
// icône HugeIcons, pour les logos de marques.
export default function Ic({ icon, size = 24, color, strokeWidth = 1.9 }: Props) {
  const theme = useTheme();
  if (typeof icon === 'function') {
    const Custom = icon;
    return <Custom size={size} color={color ?? theme.text} strokeWidth={strokeWidth} />;
  }
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color ?? theme.text}
      strokeWidth={strokeWidth}
    />
  );
}
