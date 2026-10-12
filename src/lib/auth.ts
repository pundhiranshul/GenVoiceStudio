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

export function clearAuthCredentials(): void {
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
 * Executes the actual flush of authentication credentials and reloads the session.
 */
export function executeSignOut(options: { reload?: boolean } = {}): void {
  const { reload = true } = options;
  clearAuthCredentials();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-changed'));
    if (reload) {
      window.location.reload();
    }
  }
}

// Alias for backwards compatibility with existing UI handlers
export const handleSignOut = requestSignOut;
