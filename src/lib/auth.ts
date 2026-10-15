/**
 * Authentication and Session Management for GenVoice Studio.
 *
 * Flushes only authentication tokens and session credentials.
 * User-generated data (IndexedDB audio history, custom voices, draft texts)
 * is strictly preserved so the user can sign back in without losing work.
 */

export const AUTH_STORAGE_KEYS = [
  'kaggleUsername',
  'kaggleKey',
  'appPassword',
  'modelProxyKey',
  'modelProxyExpiresAt',
  'modelProxyBaseUri',
  'voice_kernel',
  'sfx_kernel',
] as const;

let _cachedHasCredentials: boolean | null = null;

export function getCachedHasCredentials(): boolean {
  if (_cachedHasCredentials !== null) return _cachedHasCredentials;
  if (typeof window !== 'undefined') {
    _cachedHasCredentials = isUserAuthenticated();
    return _cachedHasCredentials;
  }
  return false;
}

export function setCachedHasCredentials(val: boolean): void {
  _cachedHasCredentials = val;
}

export function clearAuthCredentials(): void {
  _cachedHasCredentials = false;
  if (typeof window === 'undefined') return;
  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function isUserAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const kaggleUsername = localStorage.getItem('kaggleUsername');
  const kaggleKey = localStorage.getItem('kaggleKey');
  const appPassword = localStorage.getItem('appPassword');
  return Boolean((kaggleUsername && kaggleKey) || appPassword);
}

export function getAuthInfo(): {
  isAuthenticated: boolean;
  username: string;
  authType: 'kaggle' | 'admin' | null;
} {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, username: '', authType: null };
  }
  const kaggleUsername = localStorage.getItem('kaggleUsername');
  const kaggleKey = localStorage.getItem('kaggleKey');
  const appPassword = localStorage.getItem('appPassword');

  if (kaggleUsername && kaggleKey) {
    return { isAuthenticated: true, username: kaggleUsername, authType: 'kaggle' };
  }
  if (appPassword) {
    return { isAuthenticated: true, username: 'Admin', authType: 'admin' };
  }
  return { isAuthenticated: false, username: '', authType: null };
}

/**
 * Triggers the in-app confirmation modal (no browser popups).
 */
export function requestSignOut(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('open-signout'));
}

/**
 * Executes the actual flush of authentication credentials, optionally clears the library,
 * and redirects to the landing page.
 */
export async function executeSignOut(options: {
  reload?: boolean;
  clearLibrary?: boolean;
  redirectToLanding?: boolean;
} = {}): Promise<void> {
  const { clearLibrary = false, redirectToLanding = true } = options;
  clearAuthCredentials();

  if (clearLibrary) {
    try {
      const { clearHistory } = await import('@/lib/history');
      await clearHistory();
    } catch (e) {
      console.error('Failed to clear library on sign out', e);
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('voice_text');
      localStorage.removeItem('voice_design_text');
      localStorage.removeItem('voice_design_prompt');
      localStorage.removeItem('voice_design_name');
      localStorage.removeItem('sfx_prompt');
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-changed'));
    if (redirectToLanding) {
      if (window.location.pathname === '/') {
        window.location.reload();
      } else {
        window.location.href = '/';
      }
    } else if (options.reload) {
      window.location.reload();
    }
  }
}

// Alias for backwards compatibility with existing UI handlers
export const handleSignOut = requestSignOut;
