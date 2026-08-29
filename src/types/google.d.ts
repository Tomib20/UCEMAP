/** Tipos minimos de Google Identity Services (window.google.accounts.oauth2). */

interface GoogleTokenResponse {
  access_token: string;
  /** Segundos de vida del token (Google devuelve ~3600). */
  expires_in?: number | string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: { type?: string; message?: string }) => void;
}

interface GoogleTokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
        revoke: (token: string, done?: () => void) => void;
      };
    };
  };
}
