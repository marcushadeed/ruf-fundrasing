import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearToken, currentToken, loadGis, signIn, signOut } from '../auth/google';
import { AuthExpiredError, loadGoogleSheet } from '../data/googleSheets';
import { sampleWorkbook } from '../data/sample';
import type { AppConfig } from '../data/source';
import { parseWorkbook } from '../domain/parse';
import type { RawWorkbook, Workbook } from '../domain/types';

const AUTO_REFRESH_MS = 5 * 60_000;

export interface WorkbookState {
  workbook: Workbook | null;
  loading: boolean;
  /** Shown as a banner; previously loaded data stays visible. */
  error: string | null;
  needsSignIn: boolean;
  loadedAt: Date | null;
  refresh: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => void;
}

export function useWorkbook(config: AppConfig): WorkbookState {
  const [raw, setRaw] = useState<RawWorkbook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (config.demo) {
      setRaw(sampleWorkbook());
      setLoadedAt(new Date());
      return;
    }
    const token = currentToken();
    if (!token) {
      setNeedsSignIn(true);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      setRaw(await loadGoogleSheet(config.sheetId, token));
      setLoadedAt(new Date());
      setError(null);
      setNeedsSignIn(false);
    } catch (e) {
      if (e instanceof AuthExpiredError) {
        clearToken();
        setNeedsSignIn(true);
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [config.demo, config.sheetId]);

  useEffect(() => {
    if (!config.demo) loadGis().catch((e: Error) => setError(e.message));
    void refresh();
  }, [config.demo, refresh]);

  // Auto refresh while the tab is visible.
  useEffect(() => {
    if (config.demo) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && currentToken()) void refresh();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [config.demo, refresh]);

  const doSignIn = useCallback(async () => {
    try {
      await signIn(config.clientId);
      setError(null);
      setNeedsSignIn(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [config.clientId, refresh]);

  const doSignOut = useCallback(() => {
    signOut();
    setRaw(null);
    setLoadedAt(null);
    setNeedsSignIn(true);
  }, []);

  const workbook = useMemo(() => (raw ? parseWorkbook(raw) : null), [raw]);

  return { workbook, loading, error, needsSignIn, loadedAt, refresh, signIn: doSignIn, signOut: doSignOut };
}
