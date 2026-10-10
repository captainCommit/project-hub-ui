import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { authApi, clearAuthToken } from '@/api/auth';
import { accountsApi } from '@/api/accounts';
import { AUTH_EXPIRED_EVENT, ProjectHubApiError, ProjectHubNetworkError } from '@/api/client';
import {
  CALLBACK_PATH,
  SignInError,
  beginLogin,
  isCognitoMode,
  redirectToCognitoLogout,
  resetLoginAttempts,
  takeCallbackCode,
} from '@/lib/cognitoSession';

/** @typedef {import('@/api/accounts').ProjectHubAccount} ProjectHubAccount */

const AuthContext = createContext(/** @type {unknown} */ (null));
const SELECTED_ACCOUNT_STORAGE_KEY = 'project_hub_selected_account_id';

const getStoredSelectedAccountId = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY);
};

const persistSelectedAccountId = (/** @type {string | null} */ accountId) => {
  if (typeof window === 'undefined') return;

  if (accountId) {
    window.localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, accountId);
  } else {
    window.localStorage.removeItem(SELECTED_ACCOUNT_STORAGE_KEY);
  }
};

const AUTH_REQUIRED = { type: 'auth_required' };

/**
 * Turn anything thrown while signing in or loading the user into one of the
 * states App renders: auth_required, login_error, service_unavailable,
 * network_error, user_disabled, account_conflict, startup_error.
 */
const classifyAuthError = (/** @type {unknown} */ error, fallbackType = 'startup_error') => {
  if (error instanceof SignInError) return { type: 'login_error', message: error.message };
  if (error instanceof ProjectHubNetworkError) return { type: 'network_error', message: error.message };
  if (error instanceof ProjectHubApiError) {
    switch (error.code) {
      case 'AUTH_REQUIRED':
      case 'TOKEN_EXPIRED':
      case 'TOKEN_INVALID':
      case 'SESSION_EXPIRED':
        return AUTH_REQUIRED;
      case 'LOGIN_FAILED':
      case 'CSRF_CHECK_FAILED':
        return { type: 'login_error', message: error.message };
      case 'AUTH_UNAVAILABLE':
      case 'AUTH_NOT_CONFIGURED':
        return { type: 'service_unavailable', message: error.message };
      case 'USER_DISABLED':
        return { type: 'user_disabled', message: error.message };
      case 'ACCOUNT_CONFLICT':
        return { type: 'account_conflict', message: error.message };
      default:
        if (error.status === 401) return AUTH_REQUIRED;
        if (error.status >= 500) return { type: 'service_unavailable', title: 'Project Hub is temporarily unavailable', message: 'Project Hub is having trouble right now. Please try again shortly.' };
    }
  }
  return fallbackType === 'account_error'
    ? { type: 'account_error', message: 'We could not load your Project Hub accounts. Please refresh and try again.' }
    : { type: 'startup_error', message: 'We could not load your Project Hub user profile. Please refresh or sign in again.' };
};

export const AuthProvider = (/** @type {{ children: React.ReactNode }} */ { children }) => {
  const [user, setUser] = useState(/** @type {unknown} */ (null));
  const [accounts, setAccounts] = useState(/** @type {ProjectHubAccount[]} */ ([]));
  const [selectedAccountId, setSelectedAccountIdState] = useState(/** @type {string | null} */ (null));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(/** @type {any} */ (null));
  const [appPublicSettings, setAppPublicSettings] = useState(/** @type {unknown} */ (null)); // Contains only { id, public_settings }
  const [postLoginPath, setPostLoginPath] = useState(/** @type {string | null} */ (null));

  const applyAccountSelection = useCallback((
    /** @type {ProjectHubAccount[]} */ nextAccounts,
    /** @type {string | null} */ preferredAccountId = getStoredSelectedAccountId()
  ) => {
    if (!nextAccounts.length) {
      persistSelectedAccountId(null);
      setSelectedAccountIdState(null);
      return null;
    }

    const selected = nextAccounts.find((account) => account.id === preferredAccountId) ?? nextAccounts[0];
    persistSelectedAccountId(selected.id);
    setSelectedAccountIdState(selected.id);
    return selected;
  }, []);

  const clearUserState = useCallback(() => {
    setUser(null);
    setAccounts([]);
    setSelectedAccountIdState(null);
    setIsAuthenticated(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return currentUser;
    } catch (error) {
      console.warn('Project Hub startup user load failed:', error);
      const friendlyError = classifyAuthError(error);
      clearUserState();
      setAuthError(friendlyError);
      throw friendlyError;
    }
  }, [clearUserState]);

  const refreshAccounts = useCallback(async (/** @type {{ is_platform_admin?: boolean } | null} */ currentUser = null) => {
    try {
      const nextAccounts = await accountsApi.list();
      setAccounts(nextAccounts);
      applyAccountSelection(nextAccounts);
      // A signed-in Cognito user who belongs to no account can't do anything yet,
      // except a platform admin, who can still create accounts.
      const stranded = isCognitoMode() && nextAccounts.length === 0 && !currentUser?.is_platform_admin;
      setAuthError(stranded ? { type: 'user_not_registered' } : null);
      return nextAccounts;
    } catch (error) {
      console.warn('Project Hub account load failed:', error);
      const friendlyError = classifyAuthError(error, 'account_error');
      setAuthError(friendlyError);
      throw friendlyError;
    }
  }, [applyAccountSelection]);

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    setIsLoadingAuth(true);
    setAuthError(null);
    setAppPublicSettings({ public_settings: {} });
    setIsLoadingPublicSettings(false);

    try {
      if (isCognitoMode() && window.location.pathname === CALLBACK_PATH) {
        const { returnTo, ...session } = takeCallbackCode();
        try {
          await authApi.createSession(session);
        } catch (error) {
          // Never bounce a failed exchange back to Cognito: its session would hand us a fresh
          // code that fails the same way. Show the problem instead.
          const classified = classifyAuthError(error);
          throw classified.type === 'auth_required'
            ? new SignInError(error instanceof Error && error.message ? error.message : 'Sign-in could not be completed.')
            : error;
        }
        setPostLoginPath(returnTo);
      }
      const currentUser = await refreshUser();
      if (isCognitoMode()) resetLoginAttempts();
      await refreshAccounts(currentUser);
    } catch (error) {
      // refreshUser/refreshAccounts store their own friendly errors; classify the rest (callback exchange).
      if (error && typeof error === 'object' && 'type' in error) return;
      clearUserState();
      setAuthError(classifyAuthError(error));
    } finally {
      setIsLoadingAuth(false);
    }
  }, [clearUserState, refreshAccounts, refreshUser]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  // The API client fires this when a session could not be renewed mid-use.
  useEffect(() => {
    const onExpired = () => {
      clearUserState();
      setAuthError(AUTH_REQUIRED);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clearUserState]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const setSelectedAccountId = useCallback((/** @type {string | null} */ accountId) => {
    const nextSelectedAccount = accounts.find((account) => account.id === accountId) ?? null;
    const nextAccountId = nextSelectedAccount?.id ?? null;
    persistSelectedAccountId(nextAccountId);
    setSelectedAccountIdState(nextAccountId);
  }, [accounts]);

  const logout = async (shouldRedirect = true) => {
    clearUserState();
    clearAuthToken();
    persistSelectedAccountId(null);

    if (isCognitoMode()) {
      // Clear the cookies and revoke the refresh token; sign out of Cognito even if the API is unreachable.
      await authApi.endSession().catch((error) => console.warn('Sign-out request failed:', error));
      redirectToCognitoLogout();
      return;
    }

    if (shouldRedirect && typeof window !== 'undefined') {
      window.location.assign(window.location.pathname);
    }
  };

  const navigateToLogin = (/** @type {string | undefined} */ returnTo) => {
    if (!isCognitoMode()) {
      setAuthError(null);
      return;
    }
    beginLogin(returnTo).catch((error) => setAuthError(classifyAuthError(error)));
  };

  const loading = isLoadingPublicSettings || isLoadingAuth;

  return (
    <AuthContext.Provider value={{
      user,
      accounts,
      selectedAccount,
      selectedAccountId,
      setSelectedAccountId,
      loading,
      error: authError,
      refreshUser,
      refreshAccounts,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      postLoginPath,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = /** @type {any} */ (useContext(AuthContext));
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
