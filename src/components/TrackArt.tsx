import { MusicNote01Icon } from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../store/theme';
import Ic from './Ic';

type Props = {
  uri?: string;
  style: StyleProp<ViewStyle & ImageStyle>;
  iconSize?: number;
};

/**
 * Cover image that falls back to a music note when there is no artwork or the
 * source fails to load — remote thumbnails often 404 once a video is gone, and
 * a bare Image would leave an empty grey square.
 */
export default function TrackArt({ uri, style, iconSize = 20 }: Props) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  if (!uri || failed) {
    return (
      <View style={[style, styles.placeholder, { backgroundColor: theme.surfaceHi }]}>
        <Ic icon={MusicNote01Icon} size={iconSize} color={theme.textFaint} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style as StyleProp<ImageStyle>}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
