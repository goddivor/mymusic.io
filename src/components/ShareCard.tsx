import { MusicNote01Icon } from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useI18n } from '../i18n';
import { useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import { AppTrack } from '../types';
import Ic from './Ic';

export const SHARE_W = 360;
export const SHARE_H = 640;

type Props = {
  track: AppTrack | null;
  artwork?: string;
  fallbackArtwork?: string;
};

// The visual that gets captured to an image and shared to Stories / Status.
const ShareCard = React.forwardRef<View, Props>(
  ({ track, artwork, fallbackArtwork }, ref) => {
    const styles = useThemedStyles(makeStyles);
    const { t } = useI18n();
    const initial = artwork ?? track?.artwork;
    const [src, setSrc] = useState<string | undefined>(initial);

    useEffect(() => {
      setSrc(artwork ?? track?.artwork);
    }, [artwork, track?.artwork]);

    const onError = () => {
      const fb = fallbackArtwork ?? track?.artwork;
      if (fb && fb !== src) setSrc(fb);
      else setSrc(undefined);
    };

    return (
      <View ref={ref} collapsable={false} style={styles.card}>
        <Svg width={SHARE_W} height={SHARE_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="share" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#8B5CF6" />
              <Stop offset="0.5" stopColor="#6D28D9" />
              <Stop offset="1" stopColor="#EC4899" />
            </LinearGradient>
          </Defs>
          <Rect width={SHARE_W} height={SHARE_H} fill="url(#share)" />
        </Svg>

        <View style={styles.inner}>
          <Text style={styles.kicker}>{t('iListen')}</Text>
          <View style={styles.artWrap}>
            {src ? (
              <Image source={{ uri: src }} style={styles.art} onError={onError} />
            ) : (
              <View style={[styles.art, styles.placeholder]}>
                <Ic icon={MusicNote01Icon} size={110} color="rgba(255,255,255,0.85)" />
              </View>
            )}
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {track?.title ?? ''}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track?.artist ?? ''}
          </Text>

          <View style={styles.brand}>
            <View style={styles.brandDot}>
              <Ic icon={MusicNote01Icon} size={18} color="#fff" strokeWidth={2.4} />
            </View>
            <Text style={styles.brandText}>MusicApp</Text>
          </View>
        </View>
      </View>
    );
  },
);

export default ShareCard;

const makeStyles = (theme: Palette) => StyleSheet.create({
  card: {
    width: SHARE_W,
    height: SHARE_H,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: theme.accent,
  },
  inner: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  kicker: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 26,
  },
  artWrap: {
    width: 256,
    height: 256,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  art: { width: 256, height: 256 },
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 30,
  },
  artist: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    textAlign: 'center',
    marginTop: 9,
  },
  brand: { flexDirection: 'row', alignItems: 'center', marginTop: 44 },
  brandDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  brandText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
});
