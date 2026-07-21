import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { setLang } from '../i18n';
import { applyTheme, ThemeScheme } from '../theme';

export type LanguagePref = 'system' | 'fr' | 'en';
export type ThemePref = 'system' | 'dark' | 'light';

export type AppSettings = {
  language: LanguagePref;
  theme: ThemePref;
};

const KEY = 'app_settings';

let current: AppSettings = { language: 'system', theme: 'system' };

/**
 * Loads the preferences and applies the palette. Must be awaited BEFORE the
 * app is required (index.js) so the StyleSheets freeze the right palette.
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) current = { ...current, ...JSON.parse(raw) };
  } catch {}
  applyTheme(effectiveScheme());
  setLang(effectiveLanguage());
  return current;
}

export function getSettings(): AppSettings {
  return current;
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  current = { ...current, ...patch };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
}

export function effectiveScheme(): ThemeScheme {
  if (current.theme !== 'system') return current.theme;
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

export function effectiveLanguage(): 'fr' | 'en' {
  if (current.language !== 'system') return current.language;
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'fr';
    return locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'fr';
  }
}
