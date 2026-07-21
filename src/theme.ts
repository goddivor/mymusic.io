// Design tokens — "our style": deep near-black with a violet→pink signature.
export type ThemeScheme = 'dark' | 'light';

const dark = {
  bg: '#0A0A0F',
  bg2: '#101017',
  surface: '#16161F',
  surfaceHi: '#1E1E2A',
  text: '#F5F5F8',
  textDim: '#9B9BAC',
  textFaint: '#63636F',
  accent: '#B57BFF',
  accent2: '#FF6FB5',
  border: '#23232F',
};

const light = {
  bg: '#FAFAFC',
  bg2: '#FFFFFF',
  surface: '#F0F0F6',
  surfaceHi: '#E5E5EE',
  text: '#16161F',
  textDim: '#5A5A6E',
  textFaint: '#9B9BA8',
  accent: '#8B4DFF',
  accent2: '#F0479B',
  border: '#E3E3EC',
};

export type Palette = typeof dark;

export const palettes: Record<ThemeScheme, Palette> = { dark, light };

/**
 * Mutable "legacy" palette, kept in sync with the active theme by the
 * ThemeProvider (src/store/theme.tsx). Components should prefer
 * useTheme()/useThemedStyles(); this object is only a safety net for
 * non-reactive code.
 */
export const theme: Palette = { ...dark };

export function applyTheme(scheme: ThemeScheme) {
  Object.assign(theme, palettes[scheme]);
}

export type Gradient = [string, string];

export const gradients: Record<'liked' | 'youtube' | 'local', Gradient> = {
  liked: ['#8B5CF6', '#EC4899'],
  youtube: ['#FF512F', '#DD2476'],
  local: ['#0EA5E9', '#6366F1'],
};

// Deterministic gradient for user playlists, picked from a curated palette.
const playlistPalette: Gradient[] = [
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#3B82F6'],
  ['#EC4899', '#8B5CF6'],
  ['#22D3EE', '#6366F1'],
  ['#FB7185', '#A855F7'],
  ['#84CC16', '#06B6D4'],
  ['#F472B6', '#7C3AED'],
];

export function playlistGradient(seed: string): Gradient {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return playlistPalette[h % playlistPalette.length];
}
