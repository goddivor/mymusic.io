import { NativeModules, PermissionsAndroid } from 'react-native';
import { getSettings } from '../store/settings';

export type Match = {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  year?: string;
};

export type Outcome =
  | { kind: 'match'; match: Match }
  | { kind: 'none' }
  | { kind: 'silence' }
  | { kind: 'no-token' }
  | { kind: 'denied' }
  | { kind: 'offline' }
  | { kind: 'cancelled' };

type Capture = { path: string | null; source: string; level: number };

type RecorderNative = {
  capture(
    waitSeconds: number,
    clipSeconds: number,
    title: string,
    body: string,
    cancel: string,
  ): Promise<Capture>;
  notifyResult(title: string, body: string): Promise<void>;
  cancel(): Promise<void>;
};

const Recorder: RecorderNative | undefined = NativeModules.AudioRecorder;

export const CLIP_SECONDS = 10;
export const WAIT_SECONDS = 60;

export type Labels = { title: string; body: string; cancel: string };

export async function requestMic(): Promise<boolean> {
  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export async function announce(title: string, body: string): Promise<void> {
  await Recorder?.notifyResult(title, body).catch(() => {});
}

export async function cancelListening(): Promise<void> {
  await Recorder?.cancel().catch(() => {});
}

function coverOf(r: any): string | undefined {
  const art = r?.apple_music?.artwork?.url;
  if (typeof art === 'string') return art.replace('{w}', '600').replace('{h}', '600');
  const spotify = r?.spotify?.album?.images?.[0]?.url;
  return typeof spotify === 'string' ? spotify : undefined;
}

/**
 * Records a clip and asks AudD what it is. The token is a user setting rather
 * than a bundled constant: this repository is public, so a committed key would
 * be everyone's key. Both halves can fail in ways the screen must tell apart —
 * a refused microphone, a missing token and a dead network read very
 * differently to someone holding a phone up to a speaker.
 */
export async function listenAndIdentify(labels: Labels): Promise<Outcome> {
  const token = getSettings().auddToken;
  if (!token) return { kind: 'no-token' };
  if (!Recorder) return { kind: 'none' };
  if (!(await requestMic())) return { kind: 'denied' };

  let capture: Capture;
  try {
    capture = await Recorder.capture(
      WAIT_SECONDS,
      CLIP_SECONDS,
      labels.title,
      labels.body,
      labels.cancel,
    );
  } catch {
    return { kind: 'denied' };
  }
  if (capture.source === 'silence') return { kind: 'silence' };
  const path = capture.path;
  if (!path) return { kind: 'cancelled' };

  const body = new FormData();
  body.append('api_token', token);
  body.append('return', 'apple_music,spotify');
  body.append('file', { uri: `file://${path}`, name: 'clip.wav', type: 'audio/wav' } as any);

  try {
    const res = await fetch('https://api.audd.io/', { method: 'POST', body });
    const json: any = await res.json();
    const r = json?.result;
    if (!r) return { kind: 'none' };
    return {
      kind: 'match',
      match: {
        title: String(r.title ?? ''),
        artist: String(r.artist ?? ''),
        album: r.album ? String(r.album) : undefined,
        artwork: coverOf(r),
        year: typeof r.release_date === 'string' ? r.release_date.slice(0, 4) : undefined,
      },
    };
  } catch {
    return { kind: 'offline' };
  }
}
