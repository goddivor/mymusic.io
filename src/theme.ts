// Design tokens — "our style": deep near-black with a violet→pink signature.
export const theme = {
  bg: '#0A0A0F',
  bg2: '#101017',
  surface: '#16161F',
  surfaceHi: '#1E1E2A',
  text: '#F5F5F8',
  textDim: '#9B9BAC',
  textFaint: '#63636F',
  accent: '#B57BFF', // violet — active / highlight (our accent, not Spotify green)
  accent2: '#FF6FB5',
  border: '#23232F',
};

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
