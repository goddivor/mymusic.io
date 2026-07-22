import {
  ArrowLeft01Icon,
  DownloadCircle01Icon,
  FavouriteIcon,
  PlayIcon,
  RefreshIcon,
  Video01Icon,
} from '@hugeicons/core-free-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ic from '../components/Ic';
import YtVideoRow, { fmtCount } from '../components/YtVideoRow';
import { useI18n } from '../i18n';
import { parseHtmlText } from '../lib/htmlText';
import { playTracks } from '../lib/player';
import {
  extractYoutubeId,
  getComments,
  getVideoInfo,
  YtComment,
  YtVideoInfo,
} from '../lib/ytExtractor';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';

type Props = {
  url: string | null;
  onClose: () => void;
  onOpenVideo: (url: string) => void;
  onOpenWeb: (url: string) => void;
};

/**
 * Native video page: metadata + instant audio streaming (extracted stream URL
 * fed straight to the player), download, related videos and comments.
 */
export default function YoutubeVideoScreen({ url, onClose, onOpenVideo, onOpenWeb }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const lib = useLibrary();
  const [info, setInfo] = useState<YtVideoInfo | null>(null);
  const [comments, setComments] = useState<YtComment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<'comments' | 'related'>('comments');

  const load = useCallback(async (videoUrl: string) => {
    setInfo(null);
    setComments(null);
    setFailed(false);
    setTab('comments');
    try {
      const i = await getVideoInfo(videoUrl);
      setInfo(i);
      getComments(videoUrl)
        .then(c => setComments(c.items))
        .catch(() => setComments([]));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (url) load(url);
  }, [url, load]);

  const playNow = () => {
    if (!url || !info) return;
    const id = extractYoutubeId(url);
    const libTrack = id ? lib.tracksById['youtube:' + id] : undefined;
    if (libTrack) {
      playTracks([libTrack], 0);
      return;
    }
    if (!info.audioUrl) {
      ToastAndroid.show(t('loadError'), ToastAndroid.SHORT);
      return;
    }
    playTracks(
      [
        {
          id: 'youtube:' + (id ?? url),
          url: info.audioUrl,
          title: info.title,
          artist: info.uploader,
          artwork: info.thumbnail || undefined,
          duration: info.duration,
          source: 'youtube',
        },
      ],
      0,
    );
  };

  return (
    <Modal visible={url !== null} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.topBtn}>
            <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {failed ? (
          <View style={styles.center}>
            <Text style={styles.error}>{t('loadError')}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.85}
              onPress={() => url && load(url)}>
              <Ic icon={RefreshIcon} size={18} color="#1a1020" strokeWidth={2.3} />
              <Text style={styles.retryText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : !info ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} size="large" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {!!info.thumbnail && (
              <Image source={{ uri: info.thumbnail }} style={styles.hero} />
            )}
            <View style={styles.body}>
              <Text style={styles.title}>{info.title}</Text>
              <View style={styles.uploaderRow}>
                {!!info.uploaderAvatar && (
                  <Image source={{ uri: info.uploaderAvatar }} style={styles.avatar} />
                )}
                <Text style={styles.uploader} numberOfLines={1}>
                  {info.uploader}
                </Text>
              </View>
              <Text style={styles.stats}>
                {[
                  info.views > 0 ? t('viewsCount', { n: fmtCount(info.views) }) : '',
                  info.likes > 0 ? `${fmtCount(info.likes)} ♥` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.dlBtn}
                  activeOpacity={0.85}
                  onPress={() => url && onOpenWeb(url)}>
                  <Ic icon={Video01Icon} size={19} color={theme.text} strokeWidth={2.1} />
                  <Text style={styles.dlText}>{t('video')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.playBtn} activeOpacity={0.85} onPress={playNow}>
                  <Ic icon={PlayIcon} size={19} color="#1a1020" strokeWidth={2.4} />
                  <Text style={styles.playText}>{t('listen')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dlBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (url) lib.startDownload(url);
                    ToastAndroid.show(t('preparing'), ToastAndroid.SHORT);
                  }}>
                  <Ic icon={DownloadCircle01Icon} size={19} color={theme.text} strokeWidth={2.1} />
                  <Text style={styles.dlText}>{t('download')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tabs}>
                {(['comments', 'related'] as const).map(k => (
                  <TouchableOpacity
                    key={k}
                    style={styles.tabBtn}
                    activeOpacity={0.7}
                    onPress={() => setTab(k)}>
                    <Text style={[styles.tabLabel, tab === k && styles.tabLabelOn]}>
                      {k === 'comments' ? t('comments') : t('relatedVideos')}
                    </Text>
                    {tab === k && <View style={styles.tabUnderline} />}
                  </TouchableOpacity>
                ))}
              </View>

              {tab === 'related' ? (
                <View style={styles.related}>
                  {info.related.slice(0, 12).map(v => (
                    <YtVideoRow
                      key={v.url}
                      item={v}
                      onPress={() => onOpenVideo(v.url)}
                      onDownload={() => lib.startDownload(v.url)}
                    />
                  ))}
                </View>
              ) : comments === null ? (
                <ActivityIndicator color={theme.accent} style={styles.commentsLoading} />
              ) : comments.length === 0 ? (
                <Text style={styles.noComments}>{t('noComments')}</Text>
              ) : (
                comments.map((c, i) => (
                  <View key={i} style={styles.comment}>
                    {c.avatar ? (
                      <Image source={{ uri: c.avatar }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatar, styles.commentAvatarEmpty]} />
                    )}
                    <View style={styles.commentBody}>
                      <Text style={styles.commentMeta} numberOfLines={1}>
                        {c.author}
                        {c.date ? ` · ${c.date}` : ''}
                      </Text>
                      <Text style={styles.commentText}>
                        {parseHtmlText(c.text).map((seg, j) => (
                          <Text key={j} style={seg.link ? styles.commentLink : undefined}>
                            {seg.text}
                          </Text>
                        ))}
                      </Text>
                      {c.likes > 0 && (
                        <View style={styles.commentLikes}>
                          <Ic icon={FavouriteIcon} size={12} color={theme.textFaint} />
                          <Text style={styles.commentLikesText}>{fmtCount(c.likes)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  topBar: { paddingHorizontal: 8, paddingVertical: 4 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  error: { color: theme.textDim, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 18,
  },
  retryText: { color: '#1a1020', fontSize: 14, fontWeight: '800' },
  hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: theme.surfaceHi },
  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 },
  title: { color: theme.text, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  uploaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surfaceHi },
  uploader: { color: theme.text, fontSize: 14, fontWeight: '700', flex: 1 },
  stats: { color: theme.textDim, fontSize: 12.5, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: 26,
    paddingVertical: 13,
  },
  playText: { color: '#1a1020', fontSize: 13.5, fontWeight: '800' },
  dlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.surfaceHi,
    borderRadius: 26,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: theme.border,
  },
  dlText: { color: theme.text, fontSize: 13.5, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    marginTop: 22,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tabBtn: { paddingVertical: 10, marginRight: 22, alignItems: 'center' },
  tabLabel: { color: theme.textDim, fontSize: 14.5, fontWeight: '700' },
  tabLabelOn: { color: theme.text },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: theme.accent,
  },
  commentLink: { color: theme.accent, fontWeight: '700' },
  related: { marginHorizontal: -14, marginTop: 6 },
  commentsLoading: { marginTop: 16 },
  noComments: { color: theme.textFaint, fontSize: 13, marginTop: 10 },
  comment: { flexDirection: 'row', marginTop: 16, gap: 10 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.surfaceHi },
  commentAvatarEmpty: {},
  commentBody: { flex: 1 },
  commentMeta: { color: theme.textDim, fontSize: 12, fontWeight: '700' },
  commentText: { color: theme.text, fontSize: 13.5, lineHeight: 19, marginTop: 3 },
  commentLikes: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  commentLikesText: { color: theme.textFaint, fontSize: 11.5 },
});
