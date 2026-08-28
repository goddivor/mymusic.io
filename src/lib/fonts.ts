import { FontPref } from '../store/settings';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const FAMILIES: Record<Exclude<FontPref, 'system'>, Record<Weight, string>> = {
  inter: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    extrabold: 'Inter-ExtraBold',
  },
  roboto: {
    regular: 'Roboto-Regular',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-SemiBold',
    bold: 'Roboto-Bold',
    extrabold: 'Roboto-ExtraBold',
  },
};

/**
 * Android picks a bundled font by family name, so a numeric fontWeight cannot
 * select the right file: each weight maps to its own family. Returns undefined
 * for the system font so the platform default keeps applying.
 */
export function fontFamily(pref: FontPref, weight: Weight): string | undefined {
  if (pref === 'system') return undefined;
  return FAMILIES[pref][weight];
}

export function weightFor(value?: string | number): Weight {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? '400'), 10);
  if (Number.isNaN(n)) return 'regular';
  if (n >= 800) return 'extrabold';
  if (n >= 700) return 'bold';
  if (n >= 600) return 'semibold';
  if (n >= 500) return 'medium';
  return 'regular';
}
