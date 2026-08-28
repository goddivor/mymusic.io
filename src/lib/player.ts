import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
} from 'react-native-track-player';
import { getOutput, getPlayIntent, requestSeek, setPlayIntent } from './connect';
import { balancedShuffle } from './shuffle';
import { AppTrack } from '../types';

let isSetup = false;

// RNTP has no native shuffle, so we own this state. The "context" is the
// ordered list the current playback came from, used to reshuffle the upcoming
// tracks or restore the original order on demand.
let context: AppTrack[] = [];
let shuffleOn = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

export function subscribePlayer(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getShuffle(): boolean {
  return shuffleOn;
}

export async function setupPlayer(): Promise<void> {
  if (isSetup) return;
  try {
    await TrackPlayer.setupPlayer();
  } catch {}
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
  });
  await TrackPlayer.setRepeatMode(RepeatMode.Queue);
  isSetup = true;
}

export function toRNTPTrack(t: AppTrack) {
  return {
    id: t.id,
    url: t.url,
    title: t.title,
    artist: t.artist,
    artwork: t.artwork,
    duration: t.duration,
  };
}

export async function playNext(t: AppTrack): Promise<void> {
  await setupPlayer();
  const idx = await TrackPlayer.getActiveTrackIndex();
  if (idx === undefined || idx === null) {
    await TrackPlayer.add([toRNTPTrack(t)]);
    await TrackPlayer.play();
  } else {
    await TrackPlayer.add([toRNTPTrack(t)], idx + 1);
  }
}

export async function playTracks(
  tracks: AppTrack[],
  startIndex: number,
  opts?: { shuffle?: boolean; randomStart?: boolean },
): Promise<void> {
  if (tracks.length === 0) return;
  await setupPlayer();

  context = tracks;
  shuffleOn = opts?.shuffle ?? false;

  let ordered = tracks;
  let start = startIndex;
  if (shuffleOn) {
    if (opts?.randomStart) {
      ordered = balancedShuffle(tracks);
    } else {
      const head = tracks[startIndex];
      ordered = [head, ...balancedShuffle(tracks.filter((_, i) => i !== startIndex))];
    }
    start = 0;
  }

  await TrackPlayer.reset();
  await TrackPlayer.add(ordered.map(toRNTPTrack));
  if (start > 0) {
    await TrackPlayer.skip(start);
  }
  if (getOutput() === 'web') {
    await TrackPlayer.pause().catch(() => {});
  } else {
    await TrackPlayer.play();
  }
  setPlayIntent(true);
  emit();
}

/**
 * Toggle shuffle live without interrupting the current track. When turning on,
 * the upcoming tracks are reshuffled; when turning off, the original context
 * order resumes from the current track. `enrichPool` is used when the current
 * context has nothing left to shuffle (e.g. a single track played from Home) —
 * it seeds the queue with related tracks ("Dans le genre").
 */
export async function setShuffle(
  on: boolean,
  enrichPool?: AppTrack[],
): Promise<void> {
  shuffleOn = on;
  await setupPlayer();

  const idx = await TrackPlayer.getActiveTrackIndex();
  if (idx === undefined || idx === null) {
    emit();
    return;
  }
  const queue = await TrackPlayer.getQueue();
  const currentId = String((queue[idx] as any)?.id ?? (queue[idx] as any)?.url ?? '');

  let rest: AppTrack[];
  if (on) {
    let pool = context.filter(t => t.id !== currentId);
    if (pool.length === 0 && enrichPool && enrichPool.length) {
      pool = enrichPool.filter(t => t.id !== currentId);
      const head = context.find(t => t.id === currentId);
      context = head ? [head, ...pool] : pool;
    }
    rest = balancedShuffle(pool);
  } else {
    const ctxIdx = context.findIndex(t => t.id === currentId);
    rest = ctxIdx >= 0 ? context.slice(ctxIdx + 1) : [];
  }

  await TrackPlayer.removeUpcomingTracks();
  if (rest.length) {
    await TrackPlayer.add(rest.map(toRNTPTrack));
  }
  emit();
}

export async function toggleShuffle(enrichPool?: AppTrack[]): Promise<boolean> {
  await setShuffle(!shuffleOn, enrichPool);
  return shuffleOn;
}

/**
 * Play/pause that honours the chosen output: on web output the phone stays
 * silent and only the shared intent changes, which the browser follows.
 */
export async function togglePlayback(): Promise<void> {
  await setupPlayer();
  if (getOutput() === 'web') {
    setPlayIntent(!getPlayIntent());
    await TrackPlayer.pause().catch(() => {});
    return;
  }
  const state = await TrackPlayer.getPlaybackState();
  const isPlaying = state.state === 'playing';
  setPlayIntent(!isPlaying);
  if (isPlaying) await TrackPlayer.pause();
  else await TrackPlayer.play();
}

/** Seek that targets whichever device is producing the sound. */
export async function seekPlayback(to: number): Promise<void> {
  if (getOutput() === 'web') {
    requestSeek(to);
    return;
  }
  await TrackPlayer.seekTo(to);
}

/** Starts playback on whichever device currently owns the output. */
export async function resumePlayback(): Promise<void> {
  setPlayIntent(true);
  if (getOutput() === 'web') return;
  await setupPlayer();
  await TrackPlayer.play();
}
