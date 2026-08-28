import {
  Add01Icon,
  ArrowDown01Icon,
  FavouriteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  Queue01Icon,
  RepeatIcon,
  RepeatOne01Icon,
  Share08Icon,
  ShuffleIcon,
} from '@hugeicons/core-free-icons';
import Slider from '@react-native-community/slider';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Share from 'react-native-share';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import TrackPlayer, {
  RepeatMode,
  useActiveTrack,
  useIsPlaying,
  useProgress,
} from 'react-native-track-player';
import { useActionSheet } from '../components/ActionSheet';
import { ArtColors, getArtColors } from '../lib/artColor';
import Ic from '../components/Ic';
import TrackArt from '../components/TrackArt';
import ShareCard from '../components/ShareCard';
import TrackRow from '../components/TrackRow';
import {
  getShuffle,
  playNext,
  playTracks,
  resumePlayback,
  seekPlayback,
  subscribePlayer,
  togglePlayback,
  toggleShuffle,
} from '../lib/player';
import { useI18n } from '../i18n';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import { AppTrack } from '../types';

const SCREEN_W = Dimensions.get('window').width;

type Props = {
  visible: boolean;
  onClose: () => void;
  onAddToPlaylist: (track: AppTrack) => void;
  onOpenQueue: () => void;
};

function fmt(sec: number): string {
  if (!sec || sec < 0 || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NowPlayingScreen({
  visible,
  onClose,
  onAddToPlaylist,
  onOpenQueue,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const track = useActiveTrack();
  const { playing } = useIsPlaying();
  const { position, duration } = useProgress();
  const lib = useLibrary();
  const { isLiked, toggleLike } = lib;
  const { show } = useActionSheet();

  const [seeking, setSeeking] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<RepeatMode>(RepeatMode.Queue);
  const [shuffleOn, setShuffleOn] = useState(getShuffle());
  const [artColors, setArtColors] = useState<ArtColors | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const cardRef = useRef<View>(null);

  useEffect(() => subscribePlayer(() => setShuffleOn(getShuffle())), []);

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

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const dismiss = () => {
    onClose();
  };

  // Pan-to-dismiss responder: hijacks the gesture only when the inner list is
  // scrolled to the very top and the user pulls down; otherwise the ScrollView
  // scrolls normally. Past a distance/velocity threshold the screen animates
  // off and closes, else it springs back.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        scrollY.current <= 0 && g.dy > 8 && g.dy > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1.1) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  const dragX = useRef(new Animated.Value(0)).current;
  const settleRef = useRef<(dx: number, vx: number) => void>(() => {});
  const [neighbours, setNeighbours] = useState<{
    prev?: string;
    next?: string;
  }>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const queue = await TrackPlayer.getQueue();
        const idx = await TrackPlayer.getActiveTrackIndex();
        if (!alive || idx === undefined || idx === null) return;
        const art = (i: number) =>
          queue[i]?.artwork ? String(queue[i].artwork) : undefined;
        setNeighbours({ prev: art(idx - 1), next: art(idx + 1) });
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [track?.id]);

  /**
   * Ends a cover drag: past the threshold the neighbour slides fully in and the
   * player skips, otherwise the cover springs back. dragX is reset only once the
   * new track is active so the swap never flashes the old artwork.
   */
  settleRef.current = (dx, vx) => {
    const width = Dimensions.get('window').width;
    const passed = Math.abs(dx) > width * 0.22 || Math.abs(vx) > 0.5;
    const goNext = dx < 0;
    const target = goNext ? neighbours.next : neighbours.prev;
    if (!passed || target === undefined) {
      Animated.spring(dragX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();
      return;
    }
    Animated.timing(dragX, {
      toValue: goNext ? -width : width,
      duration: 190,
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

  const artPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => dragX.setValue(g.dx),
      onPanResponderRelease: (_, g) => settleRef.current(g.dx, g.vx),
      onPanResponderTerminate: () => settleRef.current(0, 0),
    }),
  ).current;

  const cycleRepeat = async () => {
    const next =
      repeat === RepeatMode.Queue
        ? RepeatMode.Track
        : repeat === RepeatMode.Track
        ? RepeatMode.Off
        : RepeatMode.Queue;
    setRepeat(next);
    await TrackPlayer.setRepeatMode(next);
  };

  if (!track) return null;

  const liked = isLiked(String(track.id));
  const sliderValue = seeking !== null ? seeking : position;

  const appTrack: AppTrack = {
    id: String(track.id),
    url: String(track.url),
    title: track.title || t('track'),
    artist: track.artist || '',
    artwork: track.artwork ? String(track.artwork) : undefined,
    source: String(track.id).startsWith('youtube:') ? 'youtube' : 'local',
  };

  const pool = [...lib.youtubeTracks, ...lib.localTracks].filter(
    t => t.id !== appTrack.id,
  );
  const key = (t: AppTrack) => (t.albumArtist ?? t.artist ?? '').toLowerCase();
  const same = pool.filter(t => key(t) && key(t) === key(appTrack));
  const sameIds = new Set(same.map(t => t.id));
  const similar = [...same, ...pool.filter(t => !sameIds.has(t.id))].slice(0, 10);

  const ytId = appTrack.id.startsWith('youtube:') ? appTrack.id.slice(8) : null;
  const shareArtwork = ytId
    ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`
    : appTrack.artwork;

  const onShare = async () => {
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const fileUri = uri.startsWith('file://') ? uri : 'file://' + uri;
      await Share.open({
        url: fileUri,
        type: 'image/png',
        failOnCancel: false,
        message: t('listeningTo', { title: appTrack.title, artist: appTrack.artist }),
      });
    } catch {
    }
  };

  const openSimilarMenu = (item: AppTrack) => {
    const lk = isLiked(item.id);
    show({
      title: item.title,
      message: item.artist,
      actions: [
        {
          label: lk ? t('unlike') : t('like'),
          icon: FavouriteIcon,
          onPress: () => toggleLike(item),
        },
        { label: t('playNext'), icon: Queue01Icon, onPress: () => playNext(item) },
        {
          label: t('addToPlaylist'),
          icon: Add01Icon,
          onPress: () => onAddToPlaylist(item),
        },
      ],
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View style={[styles.root, { transform: [{ translateY }] }]}>
        <Svg width="100%" height="58%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="np" x1="0" y1="0" x2="0.4" y2="1">
              <Stop
                offset="0"
                stopColor={artColors?.primary ?? theme.accent}
                stopOpacity={artColors ? 0.85 : 0.42}
              />
              <Stop
                offset="0.5"
                stopColor={artColors?.deep ?? '#5B2A8C'}
                stopOpacity={artColors ? 0.5 : 0.28}
              />
              <Stop offset="1" stopColor={theme.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#np)" />
        </Svg>

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header} {...pan.panHandlers}>
            <TouchableOpacity onPress={dismiss} hitSlop={12}>
              <Ic icon={ArrowDown01Icon} size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>{t('nowPlaying')}</Text>
            <TouchableOpacity onPress={() => onAddToPlaylist(appTrack)} hitSlop={12}>
              <Ic icon={Add01Icon} size={26} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} {...pan.panHandlers}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            onScroll={e => (scrollY.current = e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 28 }}>
            <View style={styles.artArea} {...artPan.panHandlers}>
              <Animated.View
                style={[styles.artTrack, { transform: [{ translateX: dragX }] }]}>
                <View style={[styles.artSlot, styles.artSlotPrev]}>
                  {neighbours.prev && (
                    <View style={styles.artWrap}>
                      <Image source={{ uri: neighbours.prev }} style={styles.art} />
                    </View>
                  )}
                </View>
                <View style={styles.artWrap}>
                  <TrackArt
                    uri={track.artwork ? String(track.artwork) : undefined}
                    style={styles.art}
                    iconSize={84}
                  />
                </View>
                <View style={[styles.artSlot, styles.artSlotNext]}>
                  {neighbours.next && (
                    <View style={styles.artWrap}>
                      <Image source={{ uri: neighbours.next }} style={styles.art} />
                    </View>
                  )}
                </View>
              </Animated.View>
            </View>

            <View style={styles.metaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                  {track.title}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                  {track.artist}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggleLike(appTrack)} hitSlop={12}>
                <Ic
                  icon={FavouriteIcon}
                  size={28}
                  color={liked ? theme.accent : theme.textDim}
                  strokeWidth={liked ? 2.6 : 1.9}
                  filled={liked}
                />
              </TouchableOpacity>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={sliderValue}
              minimumTrackTintColor={theme.accent}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.accent}
              onSlidingStart={() => setSeeking(position)}
              onValueChange={v => setSeeking(v)}
              onSlidingComplete={async v => {
                await seekPlayback(v);
                setSeeking(null);
              }}
            />
            <View style={styles.times}>
              <Text style={styles.time}>{fmt(sliderValue)}</Text>
              <Text style={styles.time}>{fmt(duration)}</Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity hitSlop={10} onPress={() => toggleShuffle(similar)}>
                <Ic
                  icon={ShuffleIcon}
                  size={22}
                  color={shuffleOn ? theme.accent : theme.textDim}
                  strokeWidth={shuffleOn ? 2.6 : 1.9}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => TrackPlayer.skipToPrevious().catch(() => {})}
                hitSlop={10}>
                <Ic icon={PreviousIcon} size={34} color={theme.text} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => togglePlayback()}>
                <Ic
                  icon={playing ? PauseIcon : PlayIcon}
                  size={34}
                  color="#1a1020"
                  strokeWidth={2.6}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => TrackPlayer.skipToNext().catch(() => {})}
                hitSlop={10}>
                <Ic icon={NextIcon} size={34} color={theme.text} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={cycleRepeat} hitSlop={10}>
                <Ic
                  icon={repeat === RepeatMode.Track ? RepeatOne01Icon : RepeatIcon}
                  size={22}
                  color={repeat !== RepeatMode.Off ? theme.accent : theme.textDim}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerBtn} onPress={onShare} hitSlop={10}>
                <Ic icon={Share08Icon} size={22} color={theme.textDim} />
                <Text style={styles.footerLabel}>{t('share')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerBtn} onPress={onOpenQueue} hitSlop={10}>
                <Ic icon={Queue01Icon} size={22} color={theme.textDim} />
                <Text style={styles.footerLabel}>{t('queue')}</Text>
              </TouchableOpacity>
            </View>

            {similar.length > 0 && (
              <View style={styles.similar}>
                <Text style={styles.similarTitle}>{t('inTheGenre')}</Text>
                {similar.map((t, i) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    onPress={() => playTracks(similar, i)}
                    onMore={() => openSimilarMenu(t)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
          </View>
        </SafeAreaView>

        <View style={styles.offscreen} pointerEvents="none">
          <ShareCard
            ref={cardRef}
            track={appTrack}
            artwork={shareArtwork}
            fallbackArtwork={appTrack.artwork}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerLabel: { color: theme.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  artArea: { paddingTop: 14, paddingBottom: 8, overflow: 'visible' },
  artTrack: { alignItems: 'center', justifyContent: 'center' },
  artSlot: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center' },
  artSlotPrev: { transform: [{ translateX: -SCREEN_W }] },
  artSlotNext: { transform: [{ translateX: SCREEN_W }] },
  artWrap: {
    width: '74%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  art: { width: '100%', height: '100%', backgroundColor: theme.surface },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  title: { color: theme.text, fontSize: 22, fontWeight: '900' },
  artist: { color: theme.textDim, fontSize: 15, marginTop: 5 },
  slider: { width: '100%', height: 36, marginTop: 8 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  time: { color: theme.textDim, fontSize: 12 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  playBtn: {
    backgroundColor: theme.accent,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingHorizontal: 4,
  },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLabel: { color: theme.textDim, fontSize: 13, fontWeight: '600' },
  similar: { marginTop: 30, marginHorizontal: -16 },
  similarTitle: {
    color: theme.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 16,
  },
  offscreen: { position: 'absolute', left: -2000, top: 0 },
});
