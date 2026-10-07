export const ADMIN_TOKEN_KEY = "cinenova_admin_token";

/**
 * Retrieves the active admin session token.
 * Uses sessionStorage so the session is automatically terminated
 * when the site/browser tab is closed.
 */
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;

  // Clear any legacy persistent localStorage so session termination is guaranteed
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem("cinestream_admin_token");
  } catch {
    // Ignore storage restrictions
  }

  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves the admin token to sessionStorage (session-scoped only).
 */
export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem("cinestream_admin_token");
  } catch {
    // Ignore storage restrictions
  }

  window.dispatchEvent(new Event("cinenova_auth_change"));
}

/**
 * Clears the admin session.
 */
export function removeAdminToken(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem("cinestream_admin_token");
  } catch {
    // Ignore storage restrictions
  }

  window.dispatchEvent(new Event("cinenova_auth_change"));
}

/**
 * Quick boolean check if the current session is authenticated as admin.
 */
export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}
