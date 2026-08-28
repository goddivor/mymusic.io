import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useActiveTrack, useIsPlaying } from 'react-native-track-player';
import {
  restorePlaybackSession,
  savePlaybackSession,
} from '../lib/playbackSession';

const SAVE_EVERY_MS = 10000;

/**
 * Keeps the listening session alive across launches: restores the last queue
 * (paused, at the saved position) on startup, then snapshots it on track
 * changes, on a timer and whenever the app leaves the foreground.
 */
export default function PlaybackSession() {
  const track = useActiveTrack();
  const { playing } = useIsPlaying();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    restorePlaybackSession();
  }, []);

  useEffect(() => {
    if (track?.id) savePlaybackSession();
  }, [track?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (playing) savePlaybackSession();
    }, SAVE_EVERY_MS);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') savePlaybackSession();
    });
    return () => sub.remove();
  }, []);

  return null;
}
