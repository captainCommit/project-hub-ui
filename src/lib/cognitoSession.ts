// Cognito hosted login (OAuth 2.0 Authorization Code + PKCE) for the browser.
// The app client is public (no secret). The API is called with the ID token,
// which carries the email/name claims the API syncs users from.

type Env = Record<string, string | undefined>;
const env: Env = (import.meta as ImportMeta & { env?: Env }).env || {};

export const AUTH_MODE = (env.VITE_AUTH_MODE || 'local').toLowerCase() === 'cognito' ? 'cognito' : 'local';

const config = {
  domain: (env.VITE_COGNITO_DOMAIN || '').replace(/\/$/, ''),
  clientId: env.VITE_COGNITO_CLIENT_ID || '',
  scopes: env.VITE_COGNITO_SCOPES || 'openid email profile',
  redirectUri: () => env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  logoutUri: () => env.VITE_COGNITO_LOGOUT_URI || `${window.location.origin}/`,
};

export const CALLBACK_PATH = '/auth/callback';
const SESSION_KEY = 'project_hub_session';
const PKCE_KEY = 'project_hub_pkce';
const REFRESH_MARGIN_MS = 60_000;

interface Session {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export const isCognitoMode = () => AUTH_MODE === 'cognito';

export const assertCognitoConfigured = () => {
  if (!config.domain || !config.clientId) {
    throw new Error('Sign-in is not configured. Set VITE_COGNITO_DOMAIN and VITE_COGNITO_CLIENT_ID.');
  }
};

const readSession = (): Session | null => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as Session : null;
  } catch {
    return null;
  }
};

const writeSession = (session: Session | null) => {
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
};

export const hasSession = () => Boolean(readSession());

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomString = (byteLength = 32) => base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));

const sha256 = async (value: string) =>
  base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));

/** Send the browser to the Cognito login page; it returns to /auth/callback. */
let redirecting = false;

export const beginLogin = async (returnTo = `${window.location.pathname}${window.location.search}`) => {
  assertCognitoConfigured();
  // Renders can ask more than once; a second call would overwrite the PKCE state mid-redirect.
  if (redirecting) return;
  redirecting = true;
  const verifier = randomString(48);
  const state = randomString(16);
  window.sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, returnTo }));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri(),
    scope: config.scopes,
    state,
    code_challenge: await sha256(verifier),
    code_challenge_method: 'S256',
  });
  window.location.assign(`${config.domain}/oauth2/authorize?${params}`);
};

const requestTokens = async (body: Record<string, string>) => {
  const response = await fetch(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, ...body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'Sign-in failed.');
  return payload as { id_token: string; access_token: string; refresh_token?: string; expires_in: number };
};

const storeTokens = (tokens: Awaited<ReturnType<typeof requestTokens>>, previousRefreshToken?: string) => {
  writeSession({
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    // Refresh grants don't return a new refresh token; keep the existing one.
    refreshToken: tokens.refresh_token || previousRefreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
};

/** Finish the redirect from Cognito. Returns the path the user was trying to reach. */
export const completeLogin = async (): Promise<string> => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error_description') || params.get('error');
  if (error) throw new Error(error);

  const pending = JSON.parse(window.sessionStorage.getItem(PKCE_KEY) || 'null');
  window.sessionStorage.removeItem(PKCE_KEY);
  const code = params.get('code');
  if (!pending || !code || params.get('state') !== pending.state) {
    throw new Error('This sign-in link is invalid or has expired. Please sign in again.');
  }

  storeTokens(await requestTokens({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri(),
    code_verifier: pending.verifier,
  }));
  return pending.returnTo && !pending.returnTo.startsWith(CALLBACK_PATH) ? pending.returnTo : '/';
};

let refreshInFlight: Promise<Session | null> | null = null;

const refreshSession = (session: Session) => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      if (!session.refreshToken) return null;
      try {
        storeTokens(await requestTokens({ grant_type: 'refresh_token', refresh_token: session.refreshToken }), session.refreshToken);
        return readSession();
      } catch {
        writeSession(null);
        return null;
      }
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
};

/** A non-expired ID token, refreshing when close to expiry. Null when signed out. */
export const getIdToken = async (forceRefresh = false): Promise<string | null> => {
  const session = readSession();
  if (!session) return null;
  if (!forceRefresh && session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session.idToken;
  return (await refreshSession(session))?.idToken ?? null;
};

export const clearSession = () => writeSession(null);

/** Clear local tokens and end the Cognito session. */
export const signOut = () => {
  const refreshToken = readSession()?.refreshToken;
  clearSession();
  if (refreshToken && config.domain && config.clientId) {
    // Best effort: invalidate the refresh token so it can't mint new sessions.
    fetch(`${config.domain}/oauth2/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken, client_id: config.clientId }),
      keepalive: true,
    }).catch(() => undefined);
  }
  if (!config.domain || !config.clientId) {
    window.location.assign('/');
    return;
  }
  const params = new URLSearchParams({ client_id: config.clientId, logout_uri: config.logoutUri() });
  window.location.assign(`${config.domain}/logout?${params}`);
};
