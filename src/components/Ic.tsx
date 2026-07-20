import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { theme } from '../theme';

type Props = {
  icon: any;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Thin wrapper around HugeIcons to enforce consistent defaults app-wide.
export default function Ic({
  icon,
  size = 24,
  color = theme.text,
  strokeWidth = 1.9,
}: Props) {
  return (
    <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={strokeWidth} />
  );
}
