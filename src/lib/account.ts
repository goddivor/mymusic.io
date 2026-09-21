import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getSettings, saveSettings } from '../store/settings';

export type Account = {
  id: string;
  email: string;
  name: string;
  photo: string | null;
};

/**
 * The Web OAuth client id from the Google Cloud project. It is a public
 * identifier, not a secret: every Android app ships one, and the Android
 * client is what binds sign-in to this package name and signing key.
 */
export const WEB_CLIENT_ID = '782109900015-tn31lifd1fllliprij5hdtpbpsbf0gdg.apps.googleusercontent.com';

export const isConfigured = () => WEB_CLIENT_ID.length > 0;

/** Only files this app creates; the rest of the user's Drive stays invisible. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const listeners = new Set<() => void>();
let current: Account | null = null;

function emit() {
  listeners.forEach(l => l());
}

export function getAccount(): Account | null {
  return current;
}

export function subscribeAccount(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function remember(a: Account | null) {
  current = a;
  saveSettings({ account: a });
  emit();
}

function fromUser(u: { id: string; email: string; name: string | null; photo: string | null }): Account {
  return { id: u.id, email: u.email, name: u.name ?? u.email, photo: u.photo };
}

/**
 * Restores the last session without any UI. The snapshot in settings paints
 * the drawer instantly; the silent sign-in then confirms the session is still
 * valid and refreshes the profile, or clears it if Google has revoked it.
 */
export async function restoreAccount(): Promise<void> {
  current = getSettings().account;
  emit();
  if (!isConfigured()) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  try {
    const res = await GoogleSignin.signInSilently();
    if (res.type === 'success') remember(fromUser(res.data.user));
    else if (current) remember(null);
  } catch {
    if (current) remember(null);
  }
}

export type SignInResult = 'ok' | 'cancelled' | 'unconfigured' | 'no-play-services' | 'error';

export async function signIn(): Promise<SignInResult> {
  if (!isConfigured()) return 'unconfigured';
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch {
    return 'no-play-services';
  }
  try {
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return 'cancelled';
    remember(fromUser(res.data.user));
    return 'ok';
  } catch {
    return 'error';
  }
}

/**
 * Asks for Drive access the first time a backup is started, not at sign-in.
 * Incremental authorisation means the consent screen names the one thing being
 * granted, at the moment it is needed.
 */
export async function ensureDriveAccess(): Promise<boolean> {
  if (!current) return false;
  try {
    const granted = await GoogleSignin.getCurrentUser();
    if (granted?.scopes?.includes(DRIVE_SCOPE)) return true;
  } catch {}
  try {
    const res = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
    return res !== null;
  } catch {
    return false;
  }
}

export async function accessToken(): Promise<string | null> {
  if (!current) return null;
  try {
    const { accessToken: token } = await GoogleSignin.getTokens();
    return token;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {}
  remember(null);
}
