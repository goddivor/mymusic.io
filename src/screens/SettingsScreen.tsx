import {
  InformationCircleIcon,
  Moon02Icon,
  MusicNote01Icon,
  TranslateIcon,
} from '@hugeicons/core-free-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { pref: themePref, setPref: setThemePref } = useThemeControls();
  const { show } = useActionSheet();

  const pickLanguage = () =>
    show({
      title: t('language'),
      actions: (['system', 'fr', 'en'] as LanguagePref[]).map(l => ({
        label: t(LANGUAGE_LABELS[l]),
        onPress: async () => {
          await saveSettings({ language: l });
          // Application immédiate : re-rend toute l'interface.
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
      </View>

      {/* --- Général --- */}
      <Text style={styles.sectionLabel}>{t('sectionGeneral')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.rowTop} activeOpacity={0.7} onPress={pickLanguage}>
          <View style={styles.iconWrap}>
            <Ic icon={TranslateIcon} size={22} color={theme.accent} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {t('language')}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {t(LANGUAGE_LABELS[settings.language])}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.rowSep} />
        <TouchableOpacity style={styles.rowTop} activeOpacity={0.7} onPress={pickTheme}>
          <View style={styles.iconWrap}>
            <Ic icon={Moon02Icon} size={22} color={theme.accent} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {t('themeLabel')}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {t(THEME_LABELS[themePref])}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* --- Qualité audio --- */}
      <Text style={styles.sectionLabel}>{t('sectionPlayback')}</Text>
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <View style={styles.iconWrap}>
            <Ic icon={MusicNote01Icon} size={22} color={theme.accent} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {t('audioQuality')}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="tail">
              {t('audioQualitySub')}
            </Text>
          </View>
        </View>
      </View>

      {/* --- À propos --- */}
      <Text style={styles.sectionLabel}>{t('sectionAbout')}</Text>
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <View style={styles.iconWrap}>
            <Ic icon={InformationCircleIcon} size={22} color={theme.accent} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {t('aboutTitle')}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="tail">
              {t('aboutSub')}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  headerTitle: { color: theme.text, fontSize: 26, fontWeight: '800' },
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
});
