import { useEffect } from 'react';
import { useActiveTrack } from 'react-native-track-player';
import { getArtColors } from '../lib/artColor';
import { setNotificationColor } from '../lib/player';

/**
 * Tints the media notification with the same cover colour as the player. A
 * heart button cannot be added here: the notification layer only exposes
 * transport buttons, with no custom action type.
 */
export default function NotificationSync() {
  const track = useActiveTrack();
  const artUri = track?.artwork ? String(track.artwork) : undefined;

  useEffect(() => {
    let alive = true;
    getArtColors(artUri).then(colors => {
      if (alive) setNotificationColor(colors?.deep);
    });
    return () => {
      alive = false;
    };
  }, [artUri]);

  return null;
}
