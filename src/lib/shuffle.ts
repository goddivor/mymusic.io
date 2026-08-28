import { AppTrack } from '../types';

const JITTER = 0.1;

function groupKey(t: AppTrack): string {
  return (t.albumArtist || t.artist || t.album || t.id).trim().toLowerCase();
}

function fisherYates<T>(arr: T[]): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * Balanced shuffle (Martin Fiedler's "The Art of Shuffling Music", the approach
 * Spotify's shuffle is modelled on). A plain random shuffle clusters an artist's
 * tracks together, which listeners read as "not random". Here each artist's
 * tracks are spread evenly around the playlist with a random rotation and ±10%
 * jitter, so no artist bunches up while the order still feels unpredictable.
 */
export function balancedShuffle(tracks: AppTrack[]): AppTrack[] {
  if (tracks.length < 3) return fisherYates(tracks);

  const groups = new Map<string, AppTrack[]>();
  for (const t of tracks) {
    const k = groupKey(t);
    const arr = groups.get(k) ?? [];
    arr.push(t);
    groups.set(k, arr);
  }

  const placed: { pos: number; track: AppTrack; key: string }[] = [];
  for (const [key, groupTracks] of groups) {
    const shuffled = fisherYates(groupTracks);
    const spacing = 1 / shuffled.length;
    const rotation = Math.random();
    shuffled.forEach((track, i) => {
      const jitter = (Math.random() - 0.5) * spacing * JITTER * 2;
      const pos = (rotation + i * spacing + jitter + 1) % 1;
      placed.push({ pos, track, key });
    });
  }

  placed.sort((a, b) => a.pos - b.pos);
  return spreadAdjacent(placed).map(p => p.track);
}

/** Pushes a track one slot further when it would follow one from the same group. */
function spreadAdjacent<T extends { key: string }>(items: T[]): T[] {
  for (let i = 1; i < items.length - 1; i++) {
    if (items[i].key !== items[i - 1].key) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].key === items[i].key) continue;
      if (items[j - 1].key === items[i].key) continue;
      [items[i], items[j]] = [items[j], items[i]];
      break;
    }
  }
  return items;
}
