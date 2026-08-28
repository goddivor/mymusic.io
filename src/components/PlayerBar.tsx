import {
  CastIcon,
  FavouriteIcon,
  PauseIcon,
  PlayIcon,
} from '@hugeicons/core-free-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TrackPlayer, {
  useActiveTrack,
  useIsPlaying,
  useProgress,
} from 'react-native-track-player';
import { ArtColors, getArtColors, readableOn } from '../lib/artColor';
import { getOutput, getPlayIntent, getWebPosition, subscribeOutput } from '../lib/connect';
import { resumePlayback, togglePlayback } from '../lib/player';
import { setPlayerBarTop } from '../lib/gestureZones';
import { useLibrary } from '../store/library';
import { AppTrack } from '../types';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import ConnectSheet from './ConnectSheet';
import Ic from './Ic';
import TrackArt from './TrackArt';

const SWIPE_THRESHOLD = 55;
const SCREEN_W = Dimensions.get('window').width;

type Neighbour = { title: string; artist: string };

export default function PlayerBar({
  onPress,
  registerZone,
}: {
  onPress?: () => void;
  registerZone?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const track = useActiveTrack();
  const { playing } = useIsPlaying();
  const { position, duration } = useProgress();
  const { isLiked, toggleLike } = useLibrary();
  const [connectOpen, setConnectOpen] = useState(false);
  const [output, setOut] = useState(getOutput());

  useEffect(() => subscribeOutput(() => setOut(getOutput())), []);
  const [artColors, setArtColors] = useState<ArtColors | null>(null);
  const [neighbours, setNeighbours] = useState<{
    prev?: Neighbour;
    next?: Neighbour;
  }>({});
  const dragX = useRef(new Animated.Value(0)).current;
  const wrapRef = useRef<View>(null);
  const settleRef = useRef<(dx: number, vx: number) => void>(() => {});

  const artUri = track?.artwork ? String(track.artwork) : undefined;
  useEffect(() => {
    let alive = true;
    if (!artUri) {
      setArtColors(null);
      return;
    }
    getArtColors(artUri).then(c => {
      if (alive) setArtColors(c);
    });
    return () => {
      alive = false;
    };
  }, [artUri]);

  const measureZone = () => {
    if (!registerZone) return;
    wrapRef.current?.measureInWindow((_x, y, _w, h) => {
      if (h > 0) setPlayerBarTop(y);
    });
  };

  useEffect(() => {
    if (!registerZone) return;
    return () => setPlayerBarTop(Number.POSITIVE_INFINITY);
  }, [registerZone]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const queue = await TrackPlayer.getQueue();
        const idx = await TrackPlayer.getActiveTrackIndex();
        if (!alive || idx === undefined || idx === null) return;
        const at = (i: number): Neighbour | undefined =>
          queue[i]
            ? {
                title: String(queue[i].title ?? ''),
                artist: String(queue[i].artist ?? ''),
              }
            : undefined;
        setNeighbours({ prev: at(idx - 1), next: at(idx + 1) });
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [track?.id]);

  /**
   * Ends a drag on the labels: past the threshold the neighbour finishes
   * sliding in and the player skips, otherwise the current title springs back.
   */
  settleRef.current = (dx, vx) => {
    const passed = Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5;
    const goNext = dx < 0;
    const target = goNext ? neighbours.next : neighbours.prev;
    if (!passed || !target) {
      Animated.spring(dragX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();
      return;
    }
    Animated.timing(dragX, {
      toValue: goNext ? -SCREEN_W : SCREEN_W,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      const skip = goNext
        ? TrackPlayer.skipToNext()
        : TrackPlayer.skipToPrevious();
      skip
        .then(() => resumePlayback())
        .catch(() => {})
        .finally(() => dragX.setValue(0));
    });
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => dragX.setValue(g.dx),
      onPanResponderRelease: (_e, g) => settleRef.current(g.dx, g.vx),
      onPanResponderTerminate: () => settleRef.current(0, 0),
    }),
  ).current;

  if (!track) return null;

  const onWeb = output === 'web';
  const isPlaying = onWeb ? getPlayIntent() : playing;
  const shownPos = onWeb ? getWebPosition() : position;
  const pct = duration > 0 ? Math.min(shownPos / duration, 1) : 0;
  const appTrack: AppTrack = {
    id: String(track.id),
    url: String(track.url),
    title: String(track.title ?? ''),
    artist: String(track.artist ?? ''),
    artwork: track.artwork ? String(track.artwork) : undefined,
    source: String(track.id).startsWith('youtube:') ? 'youtube' : 'local',
  };
  const liked = isLiked(appTrack.id);
  const tint = artColors?.deep;
  const onTint = tint ? readableOn(tint) : theme.text;

  return (
    <View
      ref={wrapRef}
      onLayout={measureZone}
      style={[styles.wrap, tint ? { backgroundColor: tint } : null]}>
      <View style={styles.bar}>
        <View style={styles.tapArea} {...pan.panHandlers}>
        <TouchableOpacity style={styles.tapArea} activeOpacity={0.7} onPress={onPress}>
          <TrackArt
            uri={track.artwork ? String(track.artwork) : undefined}
            style={styles.art}
            iconSize={18}
          />
          <View style={styles.meta}>
            <Animated.View style={{ transform: [{ translateX: dragX }] }}>
              <View style={[styles.metaSlot, styles.metaSlotPrev]}>
                {neighbours.prev && (
                  <>
                    <Text style={[styles.title, { color: onTint }]} numberOfLines={1}>
                      {neighbours.prev.title}
                    </Text>
                    <Text
                      style={[styles.artist, { color: onTint, opacity: 0.75 }]}
                      numberOfLines={1}>
                      {neighbours.prev.artist}
                    </Text>
                  </>
                )}
              </View>
              <Text style={[styles.title, { color: onTint }]} numberOfLines={1}>
                {track.title}
              </Text>
              <Text
                style={[styles.artist, tint ? { color: onTint, opacity: 0.75 } : null]}
                numberOfLines={1}>
                {track.artist}
              </Text>
              <View style={[styles.metaSlot, styles.metaSlotNext]}>
                {neighbours.next && (
                  <>
                    <Text style={[styles.title, { color: onTint }]} numberOfLines={1}>
                      {neighbours.next.title}
                    </Text>
                    <Text
                      style={[styles.artist, { color: onTint, opacity: 0.75 }]}
                      numberOfLines={1}>
                      {neighbours.next.artist}
                    </Text>
                  </>
                )}
              </View>
            </Animated.View>
          </View>
        </TouchableOpacity>
        </View>
        <TouchableOpacity
          hitSlop={8}
          style={styles.ctrlBtn}
          onPress={() => setConnectOpen(true)}>
          <Ic
            icon={CastIcon}
            size={22}
            color={output === 'web' ? theme.accent : onTint}
            strokeWidth={output === 'web' ? 2.4 : 1.9}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          style={styles.ctrlBtn}
          onPress={() => toggleLike(appTrack)}>
          <Ic
            icon={FavouriteIcon}
            size={23}
            color={liked ? theme.accent : onTint}
            strokeWidth={liked ? 2.4 : 1.9}
            filled={liked}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          style={styles.ctrlBtn}
          onPress={() => togglePlayback()}>
          <Ic icon={isPlaying ? PauseIcon : PlayIcon} size={26} color={onTint} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
      <ConnectSheet visible={connectOpen} onClose={() => setConnectOpen(false)} />
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct * 100}%` },
            tint ? { backgroundColor: onTint } : null,
          ]}
        />
      </View>
    </View>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  wrap: {
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: theme.surfaceHi,
    overflow: 'hidden',
  },
  bar: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  tapArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  art: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.surface },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, marginHorizontal: 12, overflow: 'hidden' },
  metaSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  metaSlotPrev: { transform: [{ translateX: -SCREEN_W }] },
  metaSlotNext: { transform: [{ translateX: SCREEN_W }] },
  title: { color: theme.text, fontSize: 14, fontWeight: '700' },
  artist: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  ctrlBtn: { paddingHorizontal: 8 },
  progressTrack: {
    height: 3,
    marginHorizontal: 10,
    marginBottom: 7,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: theme.accent },
});
