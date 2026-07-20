import { useEffect } from 'react';
import { useActiveTrack } from 'react-native-track-player';
import { useLibrary } from '../store/library';

// Records the active track into "recently played" whenever it changes.
export default function RecentTracker() {
  const track = useActiveTrack();
  const { markPlayed } = useLibrary();

  useEffect(() => {
    if (track?.id) markPlayed(String(track.id));
  }, [track?.id, markPlayed]);

  return null;
}
