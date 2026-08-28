import { NativeModules } from 'react-native';

export type ArtColors = {
  primary: string;
  deep: string;
  isDark: boolean;
};

type ArtColorNative = {
  getColors(uri: string): Promise<ArtColors | null>;
};

const Native: ArtColorNative | undefined = NativeModules.ArtColor;

const cache = new Map<string, ArtColors | null>();
const MAX_CACHE = 60;

/**
 * Resolves a cover's palette, memoised per URI: the now-playing screen asks
 * again on every track change and decoding the same remote cover twice is waste.
 */
export async function getArtColors(uri?: string | null): Promise<ArtColors | null> {
  if (!Native || !uri) return null;
  const hit = cache.get(uri);
  if (hit !== undefined) return hit;
  try {
    const colors = await Native.getColors(uri);
    if (cache.size >= MAX_CACHE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(uri, colors);
    return colors;
  } catch {
    return null;
  }
}

/** Picks black or white text so labels stay readable on an extracted colour. */
export function readableOn(hex: string): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.55 ? '#ffffff' : '#111111';
}
