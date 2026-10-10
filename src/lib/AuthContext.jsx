import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { authApi, clearAuthToken } from '@/api/auth';
import { accountsApi } from '@/api/accounts';
import { AUTH_EXPIRED_EVENT, ProjectHubApiError } from '@/api/client';
import { CALLBACK_PATH, beginLogin, completeLogin, hasSession, isCognitoMode, signOut } from '@/lib/cognitoSession';

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

const createStartupError = () => ({
  type: 'startup_error',
  message: 'We could not load your Project Hub user profile. Please refresh or sign in again.',
});

const AUTH_REQUIRED = { type: 'auth_required' };

const createLoginError = (/** @type {unknown} */ error) => ({
  type: 'login_error',
  message: error instanceof Error && error.message ? error.message : 'Sign-in failed. Please try again.',
});

const createAccountError = () => ({
  type: 'account_error',
  message: 'We could not load your Project Hub accounts. Please refresh and try again.',
});

export const AuthProvider = (/** @type {{ children: React.ReactNode }} */ { children }) => {
  const [user, setUser] = useState(/** @type {unknown} */ (null));
  const [accounts, setAccounts] = useState(/** @type {ProjectHubAccount[]} */ ([]));
  const [selectedAccountId, setSelectedAccountIdState] = useState(/** @type {string | null} */ (null));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(/** @type {unknown} */ (null));
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

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return currentUser;
    } catch (error) {
      console.warn('Project Hub startup user load failed:', error);
      const sessionRejected = isCognitoMode() && error instanceof ProjectHubApiError && error.status === 401;
      const friendlyError = sessionRejected ? AUTH_REQUIRED : createStartupError();
      setUser(null);
      setAccounts([]);
      setSelectedAccountIdState(null);
      setIsAuthenticated(false);
      setAuthError(friendlyError);
      throw friendlyError;
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    try {
      const nextAccounts = await accountsApi.list();
      setAccounts(nextAccounts);
      applyAccountSelection(nextAccounts);
      setAuthError(null);
      return nextAccounts;
    } catch (error) {
      console.warn('Project Hub account load failed:', error);
      const friendlyError = createAccountError();
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

    if (isCognitoMode()) {
      if (window.location.pathname === CALLBACK_PATH) {
        try {
          setPostLoginPath(await completeLogin());
        } catch (error) {
          setAuthError(createLoginError(error));
          setIsLoadingAuth(false);
          return;
        }
      }
      if (!hasSession()) {
        setAuthError(AUTH_REQUIRED);
        setIsLoadingAuth(false);
        return;
      }
    }

    try {
      await refreshUser();
      await refreshAccounts();
    } catch {
      // Friendly errors are already stored by refreshUser/refreshAccounts.
    } finally {
      setIsLoadingAuth(false);
    }
  }, [refreshAccounts, refreshUser]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  // The API client fires this when a refreshed session is still rejected.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(AUTH_REQUIRED);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

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

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setAccounts([]);
    setSelectedAccountIdState(null);
    setIsAuthenticated(false);
    clearAuthToken();
    persistSelectedAccountId(null);

    if (isCognitoMode()) {
      signOut();
      return;
    }

    if (shouldRedirect && typeof window !== 'undefined') {
      window.location.assign(window.location.pathname);
    }
  };

  const navigateToLogin = () => {
    if (!isCognitoMode()) {
      setAuthError(null);
      return;
    }
    beginLogin().catch((error) => setAuthError(createLoginError(error)));
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
