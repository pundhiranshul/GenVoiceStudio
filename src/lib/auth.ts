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

export function handleSignOut(options: { confirmPrompt?: boolean; reload?: boolean } = {}): boolean {
  const { confirmPrompt = true, reload = true } = options;

  if (typeof window !== 'undefined' && (window as any).isGenerating) {
    if (!window.confirm("You have an active generation running. Are you sure you want to sign out? Progress will be lost.")) {
      return false;
    }
  }

  if (confirmPrompt) {
    const ok = window.confirm(
      "Are you sure you want to sign out?\n\nYour authentication credentials will be flushed, but all your generated audios, custom voices, and library items will be preserved safely."
    );
    if (!ok) return false;
  }

  clearAuthCredentials();
  window.dispatchEvent(new Event('auth-changed'));

  if (reload) {
    window.location.reload();
  }
  return true;
}
