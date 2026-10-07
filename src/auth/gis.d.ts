// Minimal types for the parts of Google Identity Services we use.
interface GisTokenResponse {
  access_token?: string;
  expires_in?: string | number;
  error?: string;
  error_description?: string;
}

interface GisTokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string;
          scope: string;
          callback: (resp: GisTokenResponse) => void;
          error_callback?: (err: { type: string; message?: string }) => void;
        }): GisTokenClient;
        revoke(token: string, done: () => void): void;
      };
    };
  };
}
