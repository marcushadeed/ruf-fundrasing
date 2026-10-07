import { parseWorkbook } from './parse';
import { DEFAULT_MILESTONES, DEFAULT_STAGES, DEFAULT_YEARS, HEADERS } from './sheetSchema';
import type { RawWorkbook, TabName, Workbook } from './types';

export { HEADERS };

/** Builds a workbook from row bodies; header rows and config tabs are filled in. */
export function wb(rows: Partial<Record<TabName, string[][]>>): Workbook {
  const tabs: RawWorkbook['tabs'] = {};
  const defaults: Partial<Record<TabName, string[][]>> = {
    Years: DEFAULT_YEARS,
    Milestones: DEFAULT_MILESTONES,
    Stages: DEFAULT_STAGES,
  };
  for (const tab of Object.keys(HEADERS) as TabName[]) {
    tabs[tab] = [HEADERS[tab], ...(rows[tab] ?? defaults[tab] ?? [])];
  }
  return parseWorkbook({ title: 'Test', tabs });
}

/** Pledge row helper: one-time by default. */
export function pledge(
  id: string,
  amount: number,
  committedOn: string,
  opts: Partial<{ donor: string; kind: string; frequency: string; expected: string; start: string; end: string; status: string }> = {},
): string[] {
  return [
    id,
    opts.donor ?? `Donor ${id}`,
    opts.kind ?? 'one-time',
    String(amount),
    opts.frequency ?? '',
    committedOn,
    opts.expected ?? '',
    opts.start ?? '',
    opts.end ?? '',
    opts.status ?? 'active',
    '',
  ];
}
