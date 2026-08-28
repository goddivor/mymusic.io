import TrackPlayer from 'react-native-track-player';
import { loadKv, saveKv } from '../db/database';
import { AppTrack } from '../types';
import { getShuffle, setupPlayer, toRNTPTrack } from './player';

const KEY = 'playback_session';
const MAX_TRACKS = 200;

type Session = {
  tracks: AppTrack[];
  index: number;
  position: number;
  shuffle: boolean;
};

/** Snapshots the live queue so the next launch can offer it again. */
export async function savePlaybackSession(): Promise<void> {
  try {
    const queue = await TrackPlayer.getQueue();
    const index = await TrackPlayer.getActiveTrackIndex();
    if (!queue.length || index === undefined || index === null) return;
    const { position } = await TrackPlayer.getProgress();
    const start = Math.max(0, index - MAX_TRACKS / 2);
    const tracks = queue.slice(start, start + MAX_TRACKS) as unknown as AppTrack[];
    const session: Session = {
      tracks,
      index: index - start,
      position,
      shuffle: getShuffle(),
    };
    saveKv(KEY, JSON.stringify(session));
  } catch {}
}

/**
 * Reloads the last queue paused at the position it was left, so reopening the
 * app shows the track the user stopped on instead of an empty player. Playback
 * never auto-starts: the user presses play to resume.
 */
export async function restorePlaybackSession(): Promise<boolean> {
  try {
    const raw = loadKv(KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as Session;
    if (!session?.tracks?.length) return false;

    await setupPlayer();
    const existing = await TrackPlayer.getActiveTrackIndex();
    if (existing !== undefined && existing !== null) return false;

    await TrackPlayer.reset();
    await TrackPlayer.add(session.tracks.map(toRNTPTrack));
    const index = Math.min(Math.max(session.index, 0), session.tracks.length - 1);
    if (index > 0) await TrackPlayer.skip(index);
    if (session.position > 1) await TrackPlayer.seekTo(session.position);
    return true;
  } catch {
    return false;
  }
}
