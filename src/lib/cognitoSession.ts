// Cognito hosted login (OAuth 2.0 Authorization Code + PKCE).
// The browser only starts the redirect and hands the returned code to the API,
// which exchanges it and keeps the session in an HttpOnly, SameSite=Strict cookie.
// No tokens are ever visible to JavaScript.

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
const PKCE_KEY = 'project_hub_pkce';
const ATTEMPTS_KEY = 'project_hub_login_attempts';
const MAX_ATTEMPTS = 3;
const ATTEMPT_WINDOW_MS = 2 * 60_000;

export const isCognitoMode = () => AUTH_MODE === 'cognito';

export class SignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignInError';
  }
}

const assertConfigured = () => {
  if (!config.domain || !config.clientId) {
    throw new SignInError('Sign-in is not configured for this site (missing VITE_COGNITO_DOMAIN / VITE_COGNITO_CLIENT_ID).');
  }
};

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomString = (byteLength = 32) => base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));

const sha256 = async (value: string) =>
  base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));

/** Recent redirects to the login page; used to stop an endless sign-in loop. */
const recentAttempts = (): number[] => {
  try {
    const now = Date.now();
    return (JSON.parse(window.sessionStorage.getItem(ATTEMPTS_KEY) || '[]') as number[]).filter((t) => now - t < ATTEMPT_WINDOW_MS);
  } catch {
    return [];
  }
};

/** Call after a session is confirmed so later expiries can redirect again. */
export const resetLoginAttempts = () => window.sessionStorage.removeItem(ATTEMPTS_KEY);

let redirecting = false;

/** Send the browser to the Cognito login page; it returns to /auth/callback. */
export const beginLogin = async (returnTo = `${window.location.pathname}${window.location.search}`) => {
  assertConfigured();
  // Renders can ask more than once; a second call would overwrite the PKCE state mid-redirect.
  if (redirecting) return;
  const attempts = recentAttempts();
  if (attempts.length >= MAX_ATTEMPTS) {
    throw new SignInError("We couldn't keep you signed in. Your browser may be blocking cookies for this site.");
  }
  redirecting = true;
  window.sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify([...attempts, Date.now()]));

  const verifier = randomString(48);
  const state = randomString(16);
  window.sessionStorage.setItem(PKCE_KEY, JSON.stringify({
    verifier,
    state,
    returnTo: returnTo.startsWith(CALLBACK_PATH) ? '/' : returnTo,
  }));
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

/** Read and consume the code Cognito sent back. Throws SignInError for cancelled/forged/expired logins. */
export const takeCallbackCode = () => {
  const params = new URLSearchParams(window.location.search);
  const pending = JSON.parse(window.sessionStorage.getItem(PKCE_KEY) || 'null');
  window.sessionStorage.removeItem(PKCE_KEY);

  const cognitoError = params.get('error');
  if (cognitoError) {
    const description = params.get('error_description');
    throw new SignInError(cognitoError === 'access_denied'
      ? description || 'Sign-in was cancelled or denied.'
      : description || `Sign-in failed (${cognitoError}).`);
  }
  const code = params.get('code');
  if (!pending || !code || params.get('state') !== pending.state) {
    throw new SignInError('This sign-in link is invalid or has expired. Please sign in again.');
  }
  // The code is single-use: drop it from the address bar so a reload can't replay it.
  window.history.replaceState(null, '', pending.returnTo || '/');
  return {
    code,
    codeVerifier: pending.verifier as string,
    redirectUri: config.redirectUri(),
    returnTo: (pending.returnTo as string) || '/',
  };
};

/** End the Cognito hosted session too, so the next sign-in asks for credentials. */
export const redirectToCognitoLogout = () => {
  if (!config.domain || !config.clientId) {
    window.location.assign('/');
    return;
  }
  const params = new URLSearchParams({ client_id: config.clientId, logout_uri: config.logoutUri() });
  window.location.assign(`${config.domain}/logout?${params}`);
};
