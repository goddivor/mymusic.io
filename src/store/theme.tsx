import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import { applyTheme, Palette, palettes, ThemeScheme } from '../theme';
import { getSettings, saveSettings, ThemePref } from './settings';

type ThemeCtx = {
  theme: Palette;
  scheme: ThemeScheme;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
};

const Ctx = createContext<ThemeCtx>({
  theme: palettes.dark,
  scheme: 'dark',
  pref: 'system',
  setPref: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(getSettings().theme);
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
    }),
    [scheme, pref],
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

export function useThemedStyles<T>(make: (theme: Palette) => T): T {
  const theme = useTheme();
  return useMemo(() => make(theme), [make, theme]);
}
