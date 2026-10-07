/**
 * Browser-only Google sign-in via Google Identity Services (token model).
 * We only ever request read-only Sheets access; the token lives in memory and
 * sessionStorage (cleared when the tab closes) and expires after ~1 hour.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const STORAGE_KEY = 'ruf-dashboard:google-token';

interface StoredToken {
  value: string;
  expiresAt: number; // epoch ms
}

let token: StoredToken | null = readStored();
let gisPromise: Promise<void> | null = null;

function readStored(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const t = raw ? (JSON.parse(raw) as StoredToken) : null;
    return t && t.expiresAt > Date.now() ? t : null;
  } catch {
    return null;
  }
}

function store(t: StoredToken | null) {
  token = t;
  try {
    if (t) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode etc.): memory-only is fine.
  }
}

/** Loads the GIS script once. Call early so sign-in clicks open the popup without delay. */
export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisPromise = null;
      reject(new Error('Could not load Google sign-in. Check your connection or ad blocker.'));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

/** A valid access token, or null if the user must sign in. Treats tokens within a minute of expiry as expired. */
export function currentToken(): string | null {
  return token && token.expiresAt - 60_000 > Date.now() ? token.value : null;
}

/** Opens Google's popup (must be called from a click handler). Resolves with an access token. */
export async function signIn(clientId: string): Promise<string> {
  await loadGis();
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error_description || resp.error || 'Sign-in failed.'));
          return;
        }
        store({ value: resp.access_token, expiresAt: Date.now() + Number(resp.expires_in) * 1000 });
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        reject(new Error(err.type === 'popup_closed' ? 'Sign-in window was closed.' : err.message || 'Sign-in failed.'));
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function signOut() {
  const t = token?.value;
  store(null);
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t, () => {});
}

/** Forget the token without revoking (e.g. after the API said it expired). */
export function clearToken() {
  store(null);
}
