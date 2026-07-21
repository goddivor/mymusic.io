import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import React from 'react';
import { useTheme } from '../store/theme';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export default function BrandYoutubeIcon({ size = 24, color }: Props) {
  const theme = useTheme();
  return <FontAwesomeIcon icon={faYoutube} size={size} color={color ?? theme.text} />;
}
