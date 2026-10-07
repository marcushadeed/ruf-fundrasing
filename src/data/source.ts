import { extractSheetId } from './googleSheets';

const SHEET_KEY = 'ruf-dashboard:sheet-id';

export interface AppConfig {
  demo: boolean;
  clientId: string;
  sheetId: string;
}

/**
 * Where data comes from. Priority for the Sheet ID: `?sheet=` URL param, then the
 * ID saved in this browser, then the build-time `VITE_SHEET_ID`.
 * `?demo` uses bundled sample data and skips sign-in entirely.
 */
export function readConfig(): AppConfig {
  const params = new URLSearchParams(window.location.search);
  let saved = '';
  try {
    saved = localStorage.getItem(SHEET_KEY) ?? '';
  } catch {
    // ignore
  }
  return {
    demo: params.has('demo'),
    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim(),
    sheetId: extractSheetId(params.get('sheet') ?? saved ?? '') || (import.meta.env.VITE_SHEET_ID ?? '').trim(),
  };
}

export function saveSheetId(input: string): string {
  const id = extractSheetId(input);
  try {
    if (id) localStorage.setItem(SHEET_KEY, id);
    else localStorage.removeItem(SHEET_KEY);
  } catch {
    // ignore
  }
  return id;
}
