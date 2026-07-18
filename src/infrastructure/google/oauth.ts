import { googleClientId, GOOGLE_SHEETS_SCOPES } from './config';

type TokenResponse = { access_token: string; expires_in: number; error?: string };
type TokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };
type GoogleIdentity = { accounts: { oauth2: { initTokenClient: (options: { client_id: string; scope: string; callback: (response: TokenResponse) => void; error_callback?: (error: { type?: string }) => void }) => TokenClient } } };
declare global { interface Window { google?: GoogleIdentity } }
const GIS_URL = 'https://accounts.google.com/gsi/client';
const STATE_KEY = 'finance-pwa:google-oauth-state';
const SESSION_KEY = 'finance-pwa:google-session';
const CALLBACK_PATH = '/oauth/callback';

function loadGIS(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_URL}"]`);
    const script = existing ?? Object.assign(document.createElement('script'), { src: GIS_URL, async: true });
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Не удалось загрузить Google Identity Services')), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

export type GoogleSession = { accessToken: string; expiresAt: number };
export type GoogleRedirectResult = { session?: GoogleSession; error?: string };

export function startGoogleRedirect(): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({ client_id: googleClientId(), redirect_uri: `${window.location.origin}${CALLBACK_PATH}`, response_type: 'token', scope: GOOGLE_SHEETS_SCOPES, state, include_granted_scopes: 'true', prompt: 'consent' });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export function consumeGoogleRedirect(): GoogleRedirectResult | null {
  if (window.location.pathname !== CALLBACK_PATH) return null;
  const values = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const receivedState = values.get('state');
  sessionStorage.removeItem(STATE_KEY);
  if (!expectedState || expectedState !== receivedState) return { error: 'OAuth state не совпал. Повторите вход в Google.' };
  const oauthError = values.get('error');
  if (oauthError) return { error: `Google OAuth: ${oauthError}` };
  const accessToken = values.get('access_token');
  const expiresIn = Number(values.get('expires_in') ?? 0);
  if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) return { error: 'Google OAuth не вернул access token.' };
  const session = { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.history.replaceState({}, '', '/');
  return { session };
}

export function storedGoogleSession(): GoogleSession | null {
  try { const raw = sessionStorage.getItem(SESSION_KEY); if (!raw) return null; const session = JSON.parse(raw) as GoogleSession; if (!session.accessToken || session.expiresAt <= Date.now()) { sessionStorage.removeItem(SESSION_KEY); return null; } return session; } catch { return null; }
}
export function clearStoredGoogleSession(): void { sessionStorage.removeItem(SESSION_KEY); }
export async function signInWithGoogle(): Promise<GoogleSession> {
  await loadGIS();
  const google = window.google;
  if (!google?.accounts?.oauth2) throw new Error('Google Identity Services недоступен');
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => { if (settled) return; settled = true; window.clearTimeout(timeout); callback(); };
    const timeout = window.setTimeout(() => finish(() => reject(new Error('Окно Google OAuth не открылось. Разрешите всплывающие окна и повторите попытку.'))), 10000);
    const client = google.accounts.oauth2.initTokenClient({
      client_id: googleClientId(), scope: GOOGLE_SHEETS_SCOPES,
      callback: (response) => response.error ? finish(() => reject(new Error(`Google OAuth: ${response.error}`))) : finish(() => resolve({ accessToken: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 })),
      error_callback: (error) => finish(() => reject(new Error(`Google OAuth: ${error.type ?? 'не удалось открыть окно авторизации'}`))),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}
export function signOutFromGoogle(session: GoogleSession): Promise<void> { return fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(session.accessToken)}`, { method: 'POST' }).then((response) => { if (!response.ok) throw new Error('Не удалось завершить сеанс Google'); }); }
