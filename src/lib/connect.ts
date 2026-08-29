export type Output = 'phone' | 'web';

let output: Output = 'phone';
let playIntent = false;
let webPosition = 0;
let seekNonce = 0;
let seekTo = 0;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

/**
 * Shared playback session. The phone always owns what is playing; `output`
 * only decides which device produces the sound. In web output the phone stays
 * silent, so the intent to play and the position reported by the browser are
 * kept here rather than read from TrackPlayer. Only `setOutput` notifies:
 * subscribers hand the audio over when they are called, and a play intent or
 * a seek must never be mistaken for a device switch.
 */
export function getOutput(): Output {
  return output;
}

export function setOutput(next: Output): void {
  if (output === next) return;
  output = next;
  emit();
}

export function getPlayIntent(): boolean {
  return playIntent;
}

export function setPlayIntent(next: boolean): void {
  playIntent = next;
}

export function getWebPosition(): number {
  return webPosition;
}

export function setWebPosition(p: number): void {
  webPosition = p;
}

export function getSeek(): { nonce: number; to: number } {
  return { nonce: seekNonce, to: seekTo };
}

export function requestSeek(to: number): void {
  seekNonce += 1;
  seekTo = to;
}

export function subscribeOutput(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
