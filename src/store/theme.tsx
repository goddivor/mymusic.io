import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import { applyTheme, Palette, palettes, ThemeScheme } from '../theme';
import { fontFamily, weightFor } from '../lib/fonts';
import { FontPref, getSettings, saveSettings, ThemePref } from './settings';

type ThemeCtx = {
  theme: Palette;
  scheme: ThemeScheme;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  font: FontPref;
  setFont: (f: FontPref) => void;
};

const Ctx = createContext<ThemeCtx>({
  theme: palettes.dark,
  scheme: 'dark',
  pref: 'system',
  setPref: () => {},
  font: 'system',
  setFont: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(getSettings().theme);
  const [font, setFontState] = useState<FontPref>(getSettings().font);
  const [sysScheme, setSysScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSysScheme(colorScheme),
    );
    return () => sub.remove();
  }, []);

  const scheme: ThemeScheme =
    pref === 'system' ? (sysScheme === 'light' ? 'light' : 'dark') : pref;

  useEffect(() => {
    applyTheme(scheme);
  }, [scheme]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme: palettes[scheme],
      scheme,
      pref,
      setPref: (p: ThemePref) => {
        setPrefState(p);
        saveSettings({ theme: p });
      },
      font,
      setFont: (f: FontPref) => {
        setFontState(f);
        saveSettings({ font: f });
      },
    }),
    [scheme, pref, font],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Palette {
  return useContext(Ctx).theme;
}

export function useScheme(): ThemeScheme {
  return useContext(Ctx).scheme;
}

export function useThemeControls(): { pref: ThemePref; setPref: (p: ThemePref) => void } {
  const { pref, setPref } = useContext(Ctx);
  return { pref, setPref };
}

/**
 * Every screen builds its styles through here, so the chosen font is injected
 * once at this funnel instead of being repeated in each StyleSheet. Only
 * entries that already style text are touched, and an explicit fontFamily wins.
 */
export function useThemedStyles<T>(make: (theme: Palette) => T): T {
  const theme = useTheme();
  const font = useFont();
  return useMemo(() => withFont(make(theme), font), [make, theme, font]);
}

function withFont<T>(styles: T, font: FontPref): T {
  if (font === 'system' || !styles || typeof styles !== 'object') return styles;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(styles as Record<string, any>)) {
    const isText =
      value && typeof value === 'object' &&
      (value.fontSize !== undefined || value.fontWeight !== undefined);
    if (!isText || value.fontFamily !== undefined) {
      out[key] = value;
      continue;
    }
    // Each weight is its own family on Android; keeping fontWeight alongside
    // makes it look for a "<family>_bold" file that does not exist and fall
    // back to the system font.
    const { fontWeight, ...rest } = value;
    out[key] = { ...rest, fontFamily: fontFamily(font, weightFor(fontWeight)) };
  }
  return out as T;
}

export function useFont(): FontPref {
  return useContext(Ctx).font;
}

export function useFontControls(): {
  font: FontPref;
  setFont: (f: FontPref) => void;
} {
  const { font, setFont } = useContext(Ctx);
  return { font, setFont };
}
