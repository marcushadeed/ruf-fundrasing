import { parseDate } from './dates';
import type {
  Ask,
  Frequency,
  Gift,
  ISODate,
  Milestone,
  ParseIssue,
  Pledge,
  RawWorkbook,
  Stage,
  TabName,
  Target,
  Workbook,
  Year,
} from './types';

/** `$1,200.50` -> 1200.5, `(300)` -> -300. Returns null for blanks and junk. */
export function parseAmount(input: string | undefined): number | null {
  const s = (input ?? '').trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-');
  const cleaned = s.replace(/[$,()\s-]/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return negative ? -n : n;
}

/** `75%` -> 0.75. `0.3` -> 0.3. `30` -> 0.3 (whole numbers above 1 are read as percents). */
export function parseProbability(input: string | undefined): number | null {
  const s = (input ?? '').trim();
  if (!s) return null;
  const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(s);
  if (pct) return Number(pct[1]) / 100;
  const n = Number(s);
  if (Number.isNaN(n) || n < 0) return null;
  return n > 1 ? n / 100 : n;
}

export function parseTarget(input: string | undefined): Target | null {
  const s = (input ?? '').trim();
  const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(s);
  if (pct) return { kind: 'percent', value: Number(pct[1]) / 100 };
  const amount = parseAmount(s);
  return amount !== null && amount > 0 ? { kind: 'amount', value: amount } : null;
}

function parseBool(input: string | undefined, fallback: boolean): boolean {
  const s = (input ?? '').trim().toLowerCase();
  if (['yes', 'y', 'true', 'open', '1'].includes(s)) return true;
  if (['no', 'n', 'false', 'closed', '0'].includes(s)) return false;
  return fallback;
}

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Turns a tab's rows into objects keyed by normalized header, so columns can be
 * reordered in the sheet. Skips fully blank rows. `row` is the 1-based sheet row.
 */
function readTab(
  raw: RawWorkbook,
  tab: TabName,
  required: string[],
  issues: ParseIssue[],
): { get: (key: string) => string; row: number }[] {
  const rows = raw.tabs[tab];
  if (!rows || rows.length === 0) {
    issues.push({ tab, row: 0, message: `Tab "${tab}" is missing or empty.` });
    return [];
  }
  const header = rows[0].map(norm);
  const missing = required.filter((h) => !header.includes(h));
  if (missing.length) {
    issues.push({ tab, row: 1, message: `Missing column(s): ${missing.join(', ')}.` });
    return [];
  }
  const out: { get: (key: string) => string; row: number }[] = [];
  rows.slice(1).forEach((cells, i) => {
    if (!cells.some((c) => (c ?? '').trim())) return;
    out.push({
      row: i + 2,
      get: (key) => {
        const idx = header.indexOf(key);
        return idx === -1 ? '' : (cells[idx] ?? '').trim();
      },
    });
  });
  return out;
}

function parseYears(raw: RawWorkbook, issues: ParseIssue[]): Year[] {
  const years: Year[] = [];
  for (const r of readTab(raw, 'Years', ['year', 'goal', 'funds start'], issues)) {
    const key = r.get('year');
    const goal = parseAmount(r.get('goal'));
    const fundsStart = parseDate(r.get('funds start'));
    if (!key || goal === null || goal <= 0 || !fundsStart) {
      issues.push({ tab: 'Years', row: r.row, message: 'Needs a Year name, a positive Goal, and a valid Funds Start date.' });
      continue;
    }
    if (years.some((y) => y.key.toLowerCase() === key.toLowerCase())) {
      issues.push({ tab: 'Years', row: r.row, message: `Duplicate year "${key}" ignored.` });
      continue;
    }
    years.push({ key, goal, fundsStart });
  }
  return years.sort((a, b) => a.fundsStart.localeCompare(b.fundsStart));
}

export function metricNames(years: Year[]): string[] {
  return ['received', ...years.flatMap((y) => [`${y.key.toLowerCase()}_pledged`, `${y.key.toLowerCase()}_received`])];
}

function parseMilestones(raw: RawWorkbook, years: Year[], issues: ParseIssue[]): Milestone[] {
  const valid = metricNames(years);
  const out: Milestone[] = [];
  for (const r of readTab(raw, 'Milestones', ['label', 'metric', 'target', 'due'], issues)) {
    const metric = norm(r.get('metric'));
    const target = parseTarget(r.get('target'));
    const due = parseDate(r.get('due'));
    const problems: string[] = [];
    if (!valid.includes(metric)) problems.push(`Metric must be one of: ${valid.join(', ')}`);
    if (!target) problems.push('Target must be an amount ($60,000) or a percent (75%)');
    if (target?.kind === 'percent' && metric === 'received') problems.push('Percent targets need a year metric (e.g. y1_pledged)');
    if (!due) problems.push('Due must be a valid date');
    if (problems.length) {
      issues.push({ tab: 'Milestones', row: r.row, message: problems.join('. ') + '.' });
      continue;
    }
    out.push({
      label: r.get('label') || metric,
      metric,
      target: target!,
      due: due!,
      kind: norm(r.get('kind')) === 'minimum' ? 'minimum' : 'goal',
      row: r.row,
    });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

const FREQUENCIES: Record<string, Frequency> = {
  monthly: 'monthly',
  month: 'monthly',
  quarterly: 'quarterly',
  quarter: 'quarterly',
  annually: 'annually',
  annual: 'annually',
  yearly: 'annually',
};

function parsePledges(raw: RawWorkbook, issues: ParseIssue[]): Pledge[] {
  const out: Pledge[] = [];
  const seen = new Set<string>();
  const cols = ['donor', 'kind', 'amount', 'committed on'];
  for (const r of readTab(raw, 'Pledges', cols, issues)) {
    const problem = (message: string) => issues.push({ tab: 'Pledges', row: r.row, message });
    const kindRaw = norm(r.get('kind'));
    const kind: Pledge['kind'] | null =
      kindRaw === '' || kindRaw.startsWith('one') ? 'one-time' : kindRaw.startsWith('recur') ? 'recurring' : null;
    const amount = parseAmount(r.get('amount'));
    const expected = parseDate(r.get('expected date'));
    const startCol = parseDate(r.get('start'));
    const end = parseDate(r.get('end')) ?? undefined;
    const committedOn: ISODate | null = parseDate(r.get('committed on')) ?? expected ?? startCol;
    const statusRaw = norm(r.get('status'));
    const status: Pledge['status'] = statusRaw.startsWith('cancel') ? 'cancelled' : 'active';
    const frequency = FREQUENCIES[norm(r.get('frequency'))];

    if (!r.get('donor')) { problem('Donor is required.'); continue; }
    if (!kind) { problem('Kind must be "one-time" or "recurring".'); continue; }
    if (amount === null || amount <= 0) { problem('Amount must be a positive number.'); continue; }
    if (!committedOn) { problem('Needs a Committed On date (or an Expected Date / Start to fall back on).'); continue; }
    if (kind === 'recurring' && !frequency) { problem('Recurring pledges need a Frequency (monthly, quarterly, annually).'); continue; }
    const start = kind === 'one-time' ? (expected ?? startCol ?? committedOn) : (startCol ?? committedOn);
    if (end && end < start) { problem('End is before Start.'); continue; }

    let id = r.get('id');
    if (!id) id = `row${r.row}`;
    if (seen.has(id.toLowerCase())) { problem(`Duplicate ID "${id}"; this row was skipped.`); continue; }
    seen.add(id.toLowerCase());

    out.push({
      id,
      donor: r.get('donor'),
      kind,
      amount,
      frequency: kind === 'recurring' ? frequency : undefined,
      committedOn,
      start,
      end: kind === 'recurring' ? end : undefined,
      status,
      notes: r.get('notes'),
      row: r.row,
    });
  }
  return out;
}

function parseGifts(raw: RawWorkbook, pledges: Pledge[], issues: ParseIssue[]): Gift[] {
  const ids = new Map(pledges.map((p) => [p.id.toLowerCase(), p.id]));
  const out: Gift[] = [];
  for (const r of readTab(raw, 'Gifts', ['date', 'donor', 'amount'], issues)) {
    const date = parseDate(r.get('date'));
    const amount = parseAmount(r.get('amount'));
    if (!date || amount === null || amount <= 0) {
      issues.push({ tab: 'Gifts', row: r.row, message: 'Needs a valid Date and a positive Amount.' });
      continue;
    }
    const ref = r.get('pledge id');
    let pledgeId: string | undefined;
    if (ref) {
      pledgeId = ids.get(ref.toLowerCase());
      if (!pledgeId) {
        issues.push({
          tab: 'Gifts',
          row: r.row,
          message: `Pledge ID "${ref}" not found; counted as a standalone gift.`,
        });
      }
    }
    out.push({ date, donor: r.get('donor'), amount, pledgeId, notes: r.get('notes'), row: r.row });
  }
  return out;
}

function parseStages(raw: RawWorkbook, issues: ParseIssue[]): Stage[] {
  const out: Stage[] = [];
  for (const r of readTab(raw, 'Stages', ['stage', 'probability'], issues)) {
    const probability = parseProbability(r.get('probability'));
    if (!r.get('stage') || probability === null || probability > 1) {
      issues.push({ tab: 'Stages', row: r.row, message: 'Needs a Stage name and a Probability between 0% and 100%.' });
      continue;
    }
    out.push({ name: r.get('stage'), probability, open: parseBool(r.get('open?'), true) });
  }
  return out;
}

function parseAsks(raw: RawWorkbook, stages: Stage[], issues: ParseIssue[]): Ask[] {
  const out: Ask[] = [];
  for (const r of readTab(raw, 'Pipeline', ['name', 'stage', 'ask amount'], issues)) {
    const stage = stages.find((s) => s.name.toLowerCase() === norm(r.get('stage')));
    if (!r.get('name') || !stage) {
      issues.push({
        tab: 'Pipeline',
        row: r.row,
        message: !r.get('name') ? 'Name is required.' : `Unknown stage "${r.get('stage')}" (add it to the Stages tab).`,
      });
      continue;
    }
    const askAmount = parseAmount(r.get('ask amount')) ?? 0;
    if (askAmount < 0) {
      issues.push({ tab: 'Pipeline', row: r.row, message: 'Ask Amount cannot be negative.' });
      continue;
    }
    out.push({
      name: r.get('name'),
      stage: stage.name,
      askAmount,
      nextStep: r.get('next step'),
      nextStepDate: parseDate(r.get('next step date')) ?? undefined,
      lastContact: parseDate(r.get('last contact')) ?? undefined,
      notes: r.get('notes'),
      row: r.row,
    });
  }
  return out;
}

export function parseWorkbook(raw: RawWorkbook): Workbook {
  const issues: ParseIssue[] = [];
  const years = parseYears(raw, issues);
  const milestones = parseMilestones(raw, years, issues);
  const pledges = parsePledges(raw, issues);
  const gifts = parseGifts(raw, pledges, issues);
  const stages = parseStages(raw, issues);
  const asks = parseAsks(raw, stages, issues);
  return { title: raw.title, years, milestones, pledges, gifts, stages, asks, issues };
}
