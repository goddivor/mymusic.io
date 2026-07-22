import {
  ArrowLeft01Icon,
  Cancel01Icon,
  Download04Icon,
  GlobalIcon,
  RefreshIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BrandYoutubeIcon from '../components/BrandYoutubeIcon';
import DownloadsSheet from '../components/DownloadsSheet';
import Ic from '../components/Ic';
import YtVideoRow from '../components/YtVideoRow';
import { useI18n } from '../i18n';
import {
  getSuggestions,
  getTrending,
  searchYoutube,
  searchYoutubeMore,
  YtVideoItem,
} from '../lib/ytExtractor';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import YoutubeVideoScreen from './YoutubeVideoScreen';
import YoutubeWebScreen from './YoutubeWebScreen';

/**
 * Native YouTube tab built on NewPipeExtractor (InnerTube): trending feed,
 * search with live suggestions, native video page — no WebView involved.
 */
export default function YoutubeScreen({ active }: { active: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { startDownload, activeDownloadCount, downloads } = useLibrary();

  const [trending, setTrending] = useState<YtVideoItem[] | null>(null);
  const [trendingFailed, setTrendingFailed] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<YtVideoItem[] | null>(null);
  const [resultsQuery, setResultsQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [webOpen, setWebOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const loadedRef = useRef(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTrending = useCallback(async () => {
    setTrendingFailed(false);
    setTrending(null);
    try {
      const res = await getTrending();
      setTrending(res.items);
    } catch {
      setTrending([]);
      setTrendingFailed(true);
    }
  }, []);

  useEffect(() => {
    if (active && !loadedRef.current) {
      loadedRef.current = true;
      loadTrending();
    }
  }, [active, loadTrending]);

  const closeSearch = useCallback(() => {
    setSearchMode(false);
    setQuery('');
    setSuggestions([]);
    setResults(null);
    setResultsQuery('');
  }, []);

  useEffect(() => {
    if (!active || !searchMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSearch();
      return true;
    });
    return () => sub.remove();
  }, [active, searchMode, closeSearch]);

  const onQueryChange = (text: string) => {
    setQuery(text);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      getSuggestions(text)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 220);
  };

  const runSearch = async (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setQuery(clean);
    setSuggestions([]);
    setSearching(true);
    setResults(null);
    setResultsQuery(clean);
    try {
      const res = await searchYoutube(clean);
      setResults(res.items);
      setHasMore(res.hasMore);
    } catch {
      setResults([]);
      setHasMore(false);
    } finally {
      setSearching(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !resultsQuery) return;
    setLoadingMore(true);
    try {
      const res = await searchYoutubeMore(resultsQuery);
      setResults(prev => [...(prev ?? []), ...res.items]);
      setHasMore(res.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const listData = results ?? trending ?? [];
  const showSuggestions = searchMode && suggestions.length > 0 && results === null && !searching;
  const showList = !showSuggestions;
  const loading = searching || (results === null && trending === null);

  return (
    <View style={styles.container}>
      {searchMode ? (
        <View style={styles.searchBar}>
          <TouchableOpacity onPress={closeSearch} hitSlop={10} style={styles.iconBtn}>
            <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchYoutube')}
            placeholderTextColor={theme.textDim}
            value={query}
            onChangeText={onQueryChange}
            onSubmitEditing={() => runSearch(query)}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => onQueryChange('')}
              hitSlop={10}
              style={styles.iconBtn}>
              <Ic icon={Cancel01Icon} size={18} color={theme.textDim} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandYoutubeIcon size={26} color="#FF0000" />
            <Text style={styles.brandTitle}>YouTube</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setSearchMode(true)}
              hitSlop={10}
              style={styles.iconBtn}>
              <Ic icon={Search01Icon} size={23} color={theme.text} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWebOpen(true)}
              hitSlop={10}
              style={styles.iconBtn}>
              <Ic icon={GlobalIcon} size={22} color={theme.textDim} strokeWidth={1.9} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showSuggestions && (
        <FlatList
          data={suggestions}
          keyExtractor={(s, i) => s + i}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestion}
              activeOpacity={0.7}
              onPress={() => runSearch(item)}>
              <Ic icon={Search01Icon} size={17} color={theme.textFaint} strokeWidth={2} />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {showList &&
        (loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} size="large" />
          </View>
        ) : trendingFailed && results === null ? (
          <View style={styles.center}>
            <Text style={styles.error}>{t('loadError')}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.85}
              onPress={loadTrending}>
              <Ic icon={RefreshIcon} size={18} color="#1a1020" strokeWidth={2.3} />
              <Text style={styles.retryText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(v, i) => v.url + i}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              results === null ? (
                <Text style={styles.sectionTitle}>{t('trending')}</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <YtVideoRow
                item={item}
                onPress={() => setVideoUrl(item.url)}
                onDownload={() => startDownload(item.url)}
              />
            )}
            ListFooterComponent={
              results !== null && hasMore ? (
                <TouchableOpacity
                  style={styles.moreBtn}
                  activeOpacity={0.8}
                  onPress={loadMore}
                  disabled={loadingMore}>
                  {loadingMore ? (
                    <ActivityIndicator color={theme.accent} />
                  ) : (
                    <Text style={styles.moreText}>{t('loadMore')}</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 90 }}
          />
        ))}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setSheetOpen(true)}>
        <Ic icon={Download04Icon} size={26} color={theme.text} strokeWidth={2.1} />
        {activeDownloadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeDownloadCount}</Text>
          </View>
        )}
        {activeDownloadCount === 0 && downloads.length > 0 && <View style={styles.dot} />}
      </TouchableOpacity>

      <YoutubeVideoScreen
        url={videoUrl}
        onClose={() => setVideoUrl(null)}
        onOpenVideo={u => setVideoUrl(u)}
      />
      <YoutubeWebScreen visible={webOpen} onClose={() => setWebOpen(false)} />
      <DownloadsSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandTitle: { color: theme.text, fontSize: 21, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 2,
  },
  searchInput: { flex: 1, color: theme.text, fontSize: 16, paddingVertical: 10 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  suggestionText: { color: theme.text, fontSize: 14.5, flex: 1 },
  sectionTitle: {
    color: theme.text,
    fontSize: 19,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
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
  moreBtn: {
    alignSelf: 'center',
    backgroundColor: theme.surfaceHi,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 11,
    marginTop: 10,
  },
  moreText: { color: theme.text, fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.surfaceHi,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: theme.bg,
  },
  badgeText: { color: '#1a1020', fontSize: 12, fontWeight: '800' },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.accent,
  },
});
