import { TAB_NAMES, type RawWorkbook } from '../domain/types';

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** The access token is missing/expired; the user needs to sign in again. */
export class AuthExpiredError extends Error {}

/** The signed-in account can't read the Sheet (not shared, wrong ID, API disabled...). */
export class SheetAccessError extends Error {}

/** Accepts a full Google Sheets URL or a bare spreadsheet ID. */
export function extractSheetId(input: string): string {
  const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(input);
  return (m ? m[1] : input).trim();
}

async function getJson<T>(url: string, token: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error('Network error while contacting Google Sheets. Check your connection and try again.');
  }
  if (res.ok) return res.json() as Promise<T>;
  const body = await res.json().catch(() => null);
  const detail: string = body?.error?.message ?? res.statusText;
  if (res.status === 401) throw new AuthExpiredError('Your Google sign-in expired. Please sign in again.');
  if (res.status === 403) {
    throw new SheetAccessError(
      /has not been used|is disabled/i.test(detail)
        ? `The Google Sheets API isn't enabled for this app's Google Cloud project. (${detail})`
        : "Your Google account doesn't have access to this Sheet. Ask the owner to share it with you, or sign in with a different account.",
    );
  }
  if (res.status === 404) throw new SheetAccessError('Sheet not found. Check the Sheet ID/URL.');
  throw new Error(`Google Sheets error ${res.status}: ${detail}`);
}

/**
 * Reads all dashboard tabs in two requests: metadata (title + tab names), then one
 * batchGet for the tabs that exist. Missing tabs are left out and reported by the parser.
 * Values come back formatted as displayed ("$1,200", "75%", dates per cell format).
 */
export async function loadGoogleSheet(sheetId: string, token: string): Promise<RawWorkbook> {
  const meta = await getJson<{ properties: { title: string }; sheets: { properties: { title: string } }[] }>(
    `${API}/${encodeURIComponent(sheetId)}?fields=properties.title,sheets.properties.title`,
    token,
  );
  const actual = meta.sheets.map((s) => s.properties.title);
  const present = TAB_NAMES.flatMap((tab) => {
    const title = actual.find((t) => t.trim().toLowerCase() === tab.toLowerCase());
    return title ? [{ tab, title }] : [];
  });

  const tabs: RawWorkbook['tabs'] = {};
  if (present.length) {
    const ranges = present.map((p) => `ranges=${encodeURIComponent(`'${p.title.replace(/'/g, "''")}'`)}`).join('&');
    const data = await getJson<{ valueRanges: { values?: string[][] }[] }>(
      `${API}/${encodeURIComponent(sheetId)}/values:batchGet?${ranges}&majorDimension=ROWS`,
      token,
    );
    present.forEach((p, i) => {
      tabs[p.tab] = (data.valueRanges[i]?.values ?? []).map((row) => row.map(String));
    });
  }
  return { title: meta.properties.title, tabs };
}
