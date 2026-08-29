import {
  Add01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  AudioWave01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Download04Icon,
  MusicNote01Icon,
  RefreshIcon,
  Search01Icon,
  VolumeOffIcon,
  YoutubeIcon,
} from '@hugeicons/core-free-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Ic from '../components/Ic';
import { ArtColors, getArtColors } from '../lib/artColor';
import SlideOverModal from '../components/SlideOverModal';
import {
  Identification,
  linkIdentification,
  loadIdentifications,
  saveIdentification,
} from '../db/database';
import { useI18n } from '../i18n';
import { announce, cancelListening, listenAndIdentify, Match, Outcome } from '../lib/recognise';
import { searchYoutube } from '../lib/ytExtractor';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onSettings: () => void;
};

type Phase = 'listening' | 'match' | 'none' | 'silence' | 'denied' | 'offline' | 'no-token';

const queryOf = (m: Match) => `${m.artist} ${m.title}`.trim();

export default function IdentifyScreen({ visible, onClose, onSearch, onSettings }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { startDownload } = useLibrary();

  const [phase, setPhase] = useState<Phase>('listening');
  const [match, setMatch] = useState<Match | null>(null);
  const [history, setHistory] = useState<Identification[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [artColors, setArtColors] = useState<ArtColors | null>(null);
  const pulses = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  const apply = useCallback((outcome: Outcome) => {
    if (outcome.kind === 'match') {
      const row: Identification = {
        id: String(Date.now()),
        title: outcome.match.title,
        artist: outcome.match.artist,
        album: outcome.match.album,
        artwork: outcome.match.artwork,
        at: Date.now(),
      };
      saveIdentification(row);
      setRowId(row.id);
      setMatch(outcome.match);
      announce(outcome.match.title, outcome.match.artist);
      setHistory(loadIdentifications());
      setPhase('match');
      return;
    }
    setPhase(outcome.kind === 'cancelled' ? 'none' : outcome.kind);
  }, []);

  // The consent is asked before the clock starts, so the ten seconds of
  // listening are never spent behind a system dialog.
  const listen = useCallback(async () => {
    setMatch(null);
    setRowId(null);
    setArtColors(null);
    setPhase('listening');
    const labels = {
      title: t('listening'),
      body: t('listeningNotice'),
      cancel: t('cancel'),
    };
    apply(await listenAndIdentify(labels));
  }, [apply, t]);

  useEffect(() => {
    if (!visible) return;
    setHistory(loadIdentifications());
    setShowHistory(false);
    listen();
  }, [visible, listen]);

  // Three rings on one clock read as a single flashing disc. Staggering them by
  // a third of the cycle is what turns the target into something travelling
  // outwards, which is the whole point of the listening moment.
  useEffect(() => {
    if (phase !== 'listening') return;
    const loops = pulses.map(value => {
      value.setValue(0);
      return Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: 2100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      );
    });
    // The stagger is a JS timeout rather than Animated.delay: a delay inside
    // the sequence is JS-driven, and mixing drivers in one native loop stops
    // the whole thing without warning.
    const timers = loops.map((loop, i) => setTimeout(() => loop.start(), i * 700));
    return () => {
      timers.forEach(clearTimeout);
      loops.forEach(l => l.stop());
    };
  }, [phase, pulses]);

  useEffect(() => {
    if (!match?.artwork) return;
    let alive = true;
    getArtColors(match.artwork).then(c => {
      if (alive) setArtColors(c);
    });
    return () => {
      alive = false;
    };
  }, [match?.artwork]);

  const close = useCallback(() => {
    cancelListening();
    onClose();
  }, [onClose]);

  const download = useCallback(async () => {
    if (!match) return;
    try {
      const page = await searchYoutube(queryOf(match));
      const first = page.items[0];
      if (!first) {
        onSearch(queryOf(match));
        return;
      }
      startDownload(first.url, { title: match.title, albumCover: match.artwork });
      if (rowId) {
        linkIdentification(rowId, first.url);
        setHistory(loadIdentifications());
      }
      onClose();
    } catch {
      onSearch(queryOf(match));
    }
  }, [match, onSearch, onClose, startDownload, rowId]);

  const ring = (size: number, i: number) => {
    const value = pulses[i];
    const scale = value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.15] });
    const opacity = value.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.55, 0] });
    return (
      <Animated.View
        key={size}
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -size / 2,
            marginTop: -size / 2,
          },
          { opacity, transform: [{ scale }] },
        ]}
      />
    );
  };

  const stateBlock = (icon: any, title: string, hint: string) => (
    <View style={styles.centre}>
      <View style={styles.muted}>
        <Ic icon={icon} size={54} color={theme.textFaint} strokeWidth={1.5} />
      </View>
      <Text style={styles.bigTitle}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );

  const renderHistoryRow = ({ item }: { item: Identification }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => onSearch(`${item.artist} ${item.title}`.trim())}>
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.centred]}>
          <Ic icon={MusicNote01Icon} size={20} color={theme.textFaint} />
        </View>
      )}
      <View style={styles.rowMeta}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <View style={[styles.pill, item.trackId ? styles.pillDone : styles.pillTodo]}>
        <Ic
          icon={item.trackId ? CheckmarkCircle02Icon : Download04Icon}
          size={18}
          color={item.trackId ? theme.accent : theme.textDim}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SlideOverModal visible={visible} onRequestClose={close}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {phase === 'match' && !showHistory && (
          <Svg width="100%" height="54%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="idf" x1="0" y1="0" x2="0.4" y2="1">
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
            <Rect width="100%" height="100%" fill="url(#idf)" />
          </Svg>
        )}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={showHistory ? () => setShowHistory(false) : close}
            style={styles.hit}
            activeOpacity={0.7}>
            <Ic
              icon={showHistory ? ArrowLeft01Icon : ArrowDown01Icon}
              size={24}
              color={theme.text}
              strokeWidth={2}
            />
          </TouchableOpacity>
          {showHistory ? (
            <Text style={styles.headerTitle}>{t('identified')}</Text>
          ) : (
            <Text style={styles.cap}>{t('identifyCap')}</Text>
          )}
          {showHistory ? (
            <View style={styles.hit} />
          ) : (
            <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.hit} activeOpacity={0.7}>
              <Ic icon={Clock01Icon} size={23} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>

        {showHistory ? (
          <FlatList
            data={history}
            keyExtractor={i => i.id}
            renderItem={renderHistoryRow}
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={<Text style={styles.empty}>{t('identifyEmpty')}</Text>}
            ListFooterComponent={
              history.length ? <Text style={styles.footNote}>{t('identifyHistoryHint')}</Text> : null
            }
          />
        ) : phase === 'listening' ? (
          <View style={styles.centre}>
            <View style={styles.stage}>
              {[330, 268, 208].map((size, i) => ring(size, i))}
              <View style={styles.target}>
                <Ic icon={AudioWave01Icon} size={56} color="#14101C" strokeWidth={2} />
              </View>
            </View>
            <Text style={styles.bigTitle}>{t('listening')}</Text>
            <Text style={styles.hint}>{t('listeningHint')}</Text>
            <TouchableOpacity style={styles.cancel} onPress={close} activeOpacity={0.8}>
              <Text style={styles.cancelLabel}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : phase === 'match' && match ? (
          <ScrollView contentContainerStyle={styles.matchPad}>
            <Text style={styles.found}>{t('foundIt')}</Text>
            {match.artwork ? (
              <Image source={{ uri: match.artwork }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.centred]}>
                <Ic icon={MusicNote01Icon} size={56} color={theme.textFaint} />
              </View>
            )}
            <Text style={styles.matchTitle}>{match.title}</Text>
            <Text style={styles.matchArtist}>{match.artist}</Text>
            <Text style={styles.matchMeta}>
              {[match.album, match.year].filter(Boolean).join(' · ')}
            </Text>

            <TouchableOpacity style={styles.primary} onPress={download} activeOpacity={0.85}>
              <Ic icon={Download04Icon} size={21} color="#14101C" strokeWidth={2} />
              <Text style={styles.primaryLabel}>{t('download')}</Text>
            </TouchableOpacity>

            <View style={styles.secRow}>
              <TouchableOpacity
                style={styles.secondary}
                activeOpacity={0.8}
                onPress={() => onSearch(queryOf(match))}>
                <Ic icon={Add01Icon} size={19} color={theme.text} />
                <Text style={styles.secondaryLabel}>{t('addToPlaylist')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondary}
                activeOpacity={0.8}
                onPress={() => onSearch(queryOf(match))}>
                <Ic icon={YoutubeIcon} size={19} color={theme.text} />
                <Text style={styles.secondaryLabel}>{t('onYoutube')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => onSearch(queryOf(match))} activeOpacity={0.7}>
              <Text style={styles.alt}>
                {t('notTheRightSong')} <Text style={styles.altLink}>{t('searchManually')}</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            {phase === 'denied'
              ? stateBlock(Alert02Icon, t('micDenied'), t('micDeniedHint'))
              : phase === 'offline'
              ? stateBlock(Alert02Icon, t('identifyOffline'), t('identifyOfflineHint'))
              : phase === 'no-token'
              ? stateBlock(Alert02Icon, t('noToken'), t('noTokenHint'))
              : phase === 'silence'
              ? stateBlock(VolumeOffIcon, t('noSound'), t('noSoundHint'))
              : stateBlock(VolumeOffIcon, t('noMatch'), t('noMatchHint'))}
            <View style={styles.foot}>
              {phase === 'no-token' ? (
                <TouchableOpacity style={styles.primary} onPress={onSettings} activeOpacity={0.85}>
                  <Text style={styles.primaryLabel}>{t('openSettings')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primary} onPress={listen} activeOpacity={0.85}>
                  <Ic icon={RefreshIcon} size={21} color="#14101C" strokeWidth={2} />
                  <Text style={styles.primaryLabel}>{t('tryAgain')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.wide} onPress={() => onSearch('')} activeOpacity={0.8}>
                <Ic icon={Search01Icon} size={19} color={theme.text} />
                <Text style={styles.secondaryLabel}>{t('searchManually')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SlideOverModal>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cap: {
    flex: 1,
    textAlign: 'center',
    color: theme.textDim,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  headerTitle: { flex: 1, color: theme.text, fontSize: 20, fontWeight: '800' },
  centre: { flex: 1, alignItems: 'center', paddingHorizontal: 40 },
  centred: { alignItems: 'center', justifyContent: 'center' },
  stage: { height: 386, width: '100%', alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 1.4,
    borderColor: theme.accent,
  },
  target: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    width: 152,
    height: 152,
    borderRadius: 76,
    marginTop: 118,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigTitle: {
    color: theme.text,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 22,
    textAlign: 'center',
  },
  hint: {
    color: theme.textDim,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    textAlign: 'center',
  },
  cancel: {
    minWidth: 148,
    height: 50,
    borderRadius: 25,
    marginTop: 'auto',
    marginBottom: 46,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: { color: theme.text, fontSize: 15.5, fontWeight: '700' },
  matchPad: { paddingBottom: 40, alignItems: 'center' },
  found: {
    color: theme.accent,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginTop: 14,
  },
  cover: {
    width: 214,
    height: 214,
    borderRadius: 14,
    marginTop: 16,
    backgroundColor: theme.surfaceHi,
  },
  matchTitle: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 26,
    paddingHorizontal: 26,
    textAlign: 'center',
  },
  matchArtist: { color: theme.textDim, fontSize: 15, marginTop: 8 },
  matchMeta: { color: theme.textFaint, fontSize: 12.5, marginTop: 10 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginHorizontal: 20,
    marginTop: 30,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.accent,
  },
  primaryLabel: { color: '#14101C', fontSize: 16.5, fontWeight: '800', marginLeft: 11 },
  secRow: { flexDirection: 'row', alignSelf: 'stretch', marginHorizontal: 20, marginTop: 12, gap: 12 },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  wide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginLeft: 9 },
  alt: { color: theme.textDim, fontSize: 13.5, marginTop: 26, textAlign: 'center' },
  altLink: { color: theme.accent, fontWeight: '600' },
  foot: { paddingBottom: 46 },
  listPad: { paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  thumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: theme.surfaceHi },
  rowMeta: { flex: 1, marginLeft: 12 },
  rowTitle: { color: theme.text, fontSize: 15, fontWeight: '500' },
  rowSub: { color: theme.textDim, fontSize: 12.5, marginTop: 3 },
  pill: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pillTodo: { borderWidth: 1.5, borderColor: theme.border },
  pillDone: { backgroundColor: theme.surfaceHi },
  empty: { color: theme.textFaint, fontSize: 13.5, textAlign: 'center', marginTop: 60 },
  footNote: {
    color: theme.textFaint,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 28,
  },
});
