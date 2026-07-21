import {
  ArrowLeft01Icon,
  InformationCircleIcon,
  Moon02Icon,
  MusicNote01Icon,
  Search01Icon,
  TranslateIcon,
} from '@hugeicons/core-free-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useActionSheet } from '../components/ActionSheet';
import Ic from '../components/Ic';
import { I18nKey, setLang, useI18n } from '../i18n';
import {
  effectiveLanguage,
  getSettings,
  LanguagePref,
  saveSettings,
  ThemePref,
} from '../store/settings';
import { useTheme, useThemeControls, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';

const LANGUAGE_LABELS: Record<LanguagePref, I18nKey> = {
  system: 'system',
  fr: 'french',
  en: 'english',
};

const THEME_LABELS: Record<ThemePref, I18nKey> = {
  system: 'system',
  dark: 'darkTheme',
  light: 'lightTheme',
};

type Props = {
  onClose?: () => void;
};

export default function SettingsScreen({ onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { pref: themePref, setPref: setThemePref } = useThemeControls();
  const { show } = useActionSheet();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const pickLanguage = () =>
    show({
      title: t('language'),
      actions: (['system', 'fr', 'en'] as LanguagePref[]).map(l => ({
        label: t(LANGUAGE_LABELS[l]),
        onPress: async () => {
          await saveSettings({ language: l });
          setLang(effectiveLanguage());
        },
      })),
    });

  const pickTheme = () =>
    show({
      title: t('themeLabel'),
      actions: (['system', 'dark', 'light'] as ThemePref[]).map(p => ({
        label: t(THEME_LABELS[p]),
        onPress: () => setThemePref(p),
      })),
    });

  const settings = getSettings();

  const items = [
    {
      key: 'language',
      icon: TranslateIcon,
      title: t('language'),
      sub: t(LANGUAGE_LABELS[settings.language]),
      keywords: 'langue language français english système system fr en',
      onPress: pickLanguage,
    },
    {
      key: 'theme',
      icon: Moon02Icon,
      title: t('themeLabel'),
      sub: t(THEME_LABELS[themePref]),
      keywords: 'thème theme sombre clair dark light système system couleur color',
      onPress: pickTheme,
    },
    {
      key: 'audioQuality',
      icon: MusicNote01Icon,
      title: t('audioQuality'),
      sub: t('audioQualitySub'),
      keywords: 'qualité audio quality lecture playback son sound',
      onPress: undefined as undefined | (() => void),
    },
    {
      key: 'about',
      icon: InformationCircleIcon,
      title: t('aboutTitle'),
      sub: t('aboutSub'),
      keywords: 'à propos about version app',
      onPress: undefined as undefined | (() => void),
    },
  ];

  const q = query.trim().toLowerCase();
  const results = q
    ? items.filter(
        it =>
          it.title.toLowerCase().includes(q) ||
          it.sub.toLowerCase().includes(q) ||
          it.keywords.includes(q),
      )
    : [];

  const closeSearch = () => {
    setSearching(false);
    setQuery('');
  };

  const renderItemRow = (it: (typeof items)[number], last: boolean) => (
    <React.Fragment key={it.key}>
      <TouchableOpacity
        style={styles.rowTop}
        activeOpacity={it.onPress ? 0.7 : 1}
        onPress={it.onPress}>
        <View style={styles.iconWrap}>
          <Ic icon={it.icon} size={22} color={theme.accent} strokeWidth={2.1} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {it.title}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="tail">
            {it.sub}
          </Text>
        </View>
      </TouchableOpacity>
      {!last && <View style={styles.rowSep} />}
    </React.Fragment>
  );

  if (searching) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={closeSearch} hitSlop={10} style={styles.topBtn}>
            <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder={t('settingsSearchPlaceholder')}
            placeholderTextColor={theme.textDim}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
        </View>

        {q ? (
          <ScrollView keyboardShouldPersistTaps="handled">
            {results.length > 0 ? (
              <View style={[styles.card, styles.resultsCard]}>
                {results.map((it, i) => renderItemRow(it, i === results.length - 1))}
              </View>
            ) : (
              <Text style={styles.noResult}>{t('noResults')}</Text>
            )}
          </ScrollView>
        ) : (
          <View style={styles.searchEmpty}>
            <Text style={styles.searchEmptyTitle}>{t('settingsSearchTitle')}</Text>
            <Text style={styles.searchEmptySub}>{t('settingsSearchSub')}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.topBtn}>
          <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('settings')}</Text>
        <TouchableOpacity
          onPress={() => setSearching(true)}
          hitSlop={10}
          style={styles.topBtn}>
          <Ic icon={Search01Icon} size={22} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <Text style={styles.sectionLabel}>{t('sectionGeneral')}</Text>
        <View style={styles.card}>
          {items
            .filter(it => it.key === 'language' || it.key === 'theme')
            .map((it, i, arr) => renderItemRow(it, i === arr.length - 1))}
        </View>

        <Text style={styles.sectionLabel}>{t('sectionPlayback')}</Text>
        <View style={styles.card}>
          {renderItemRow(items.find(it => it.key === 'audioQuality')!, true)}
        </View>

        <Text style={styles.sectionLabel}>{t('sectionAbout')}</Text>
        <View style={styles.card}>
          {renderItemRow(items.find(it => it.key === 'about')!, true)}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    paddingVertical: 10,
    marginLeft: 4,
  },
  sectionLabel: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: theme.surface,
    marginHorizontal: 14,
    borderRadius: 14,
    padding: 14,
  },
  resultsCard: { marginTop: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowSep: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: theme.text, fontSize: 15.5, fontWeight: '700' },
  rowSub: { color: theme.textDim, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  searchEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  searchEmptyTitle: {
    color: theme.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  searchEmptySub: {
    color: theme.textDim,
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 8,
  },
  noResult: {
    color: theme.textFaint,
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 40,
  },
});
