import { useEffect, useRef } from 'react';
import TrackPlayer, { useActiveTrack, useIsPlaying } from 'react-native-track-player';
import {
  getOutput,
  getPlayIntent,
  getSeek,
  getWebPosition,
  requestSeek,
  setOutput,
  setPlayIntent,
  setWebPosition,
  subscribeOutput,
} from '../lib/connect';
import { playTracks } from '../lib/player';
import { WebServer } from '../lib/webServer';
import { useLibrary } from '../store/library';

const TICK_MS = 900;

/**
 * Two-way bridge with the LAN web player: publishes what the phone is playing
 * so the browser mirrors it, and applies the commands the browser sends back.
 * Polling is used rather than sockets because the embedded NanoHTTPD server
 * only speaks plain HTTP, and on a LAN a sub-second tick is imperceptible.
 */
export default function WebRemoteSync() {
  const track = useActiveTrack();
  const { playing } = useIsPlaying();
  const lib = useLibrary();
  const running = useRef(false);
  const poolRef = useRef(lib.youtubeTracks.concat(lib.localTracks));
  poolRef.current = lib.youtubeTracks.concat(lib.localTracks);

  useEffect(() => {
    let alive = true;

    const publish = async () => {
      try {
        const { position, duration } = await TrackPlayer.getProgress();
        const index = await TrackPlayer.getActiveTrackIndex();
        const onWeb = getOutput() === 'web';
        const seek = getSeek();
        WebServer.updateState(
          JSON.stringify({
            output: getOutput(),
            playing: onWeb ? getPlayIntent() : playing,
            position: onWeb ? getWebPosition() : position,
            duration,
            index: index ?? -1,
            seekNonce: seek.nonce,
            seekTo: seek.to,
            track: track
              ? {
                  id: String(track.id),
                  title: String(track.title ?? ''),
                  artist: String(track.artist ?? ''),
                  artwork: track.artwork ? String(track.artwork) : undefined,
                }
              : null,
          }),
        );
      } catch {}
    };

    const apply = async (action: string, value?: string) => {
      const onWeb = getOutput() === 'web';
      switch (action) {
        case 'play':
          setPlayIntent(true);
          return onWeb ? undefined : TrackPlayer.play();
        case 'pause':
          setPlayIntent(false);
          return onWeb ? undefined : TrackPlayer.pause();
        case 'webpos':
          setWebPosition(Number(value) || 0);
          return;
        case 'next':
          return TrackPlayer.skipToNext().catch(() => {});
        case 'prev':
          return TrackPlayer.skipToPrevious().catch(() => {});
        case 'seek':
          if (onWeb) {
            requestSeek(Number(value) || 0);
            return;
          }
          return TrackPlayer.seekTo(Number(value) || 0);
        case 'skipTo':
          return TrackPlayer.skip(Number(value) || 0).catch(() => {});
        case 'output':
          setOutput(value === 'web' ? 'web' : 'phone');
          return;
        case 'playId': {
          const pool = poolRef.current;
          const at = pool.findIndex(x => x.id === value);
          if (at >= 0) {
            setWebPosition(0);
            await playTracks(pool, at);
          }
          return;
        }
      }
    };

    const tick = async () => {
      if (!alive || running.current) return;
      running.current = true;
      try {
        if (!(await WebServer.isRunning())) return;
        await publish();
        const commands = await WebServer.drainCommands();
        for (const c of commands) await apply(c.action, c.value);
      } catch {
      } finally {
        running.current = false;
      }
    };

    const timer = setInterval(tick, TICK_MS);
    const unsub = subscribeOutput(() => {
      if (getOutput() === 'web') {
        TrackPlayer.pause().catch(() => {});
      } else {
        TrackPlayer.seekTo(getWebPosition()).catch(() => {});
        if (getPlayIntent()) TrackPlayer.play().catch(() => {});
      }
      publish();
    });
    tick();
    return () => {
      alive = false;
      clearInterval(timer);
      unsub();
    };
  }, [track, playing]);

  return null;
}
