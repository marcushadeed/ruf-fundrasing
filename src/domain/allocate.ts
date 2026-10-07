import type { ISODate, Year } from './types';

export interface YearAllocation {
  key: string;
  goal: number;
  /** Money whose date falls in this year's period. */
  raw: number;
  /** Surplus rolled in from the previous year. */
  carriedIn: number;
  /** What counts toward this year: capped at the goal, except the last year. */
  counted: number;
  /** Surplus rolled on to the next year. */
  overflowOut: number;
}

export interface Allocation {
  years: YearAllocation[];
  /** Beyond the last year's goal. */
  surplus: number;
  total: number;
}

/** Index of the year whose money period contains `date`. Money before Y1 starts funds Y1. */
export function yearIndexFor(date: ISODate, years: Year[]): number {
  let idx = 0;
  years.forEach((y, i) => {
    if (y.fundsStart <= date) idx = i;
  });
  return idx;
}

export function bucketByYear(items: { date: ISODate; amount: number }[], years: Year[]): number[] {
  const raw = years.map(() => 0);
  if (years.length === 0) return raw;
  for (const it of items) raw[yearIndexFor(it.date, years)] += it.amount;
  return raw;
}

/**
 * Money funds its own year first; anything beyond a year's goal rolls forward
 * to the next year. Money never moves backward (Y2 payments can't fund Y1).
 */
export function allocate(raw: number[], years: Year[]): Allocation {
  let carry = 0;
  const out: YearAllocation[] = years.map((y, i) => {
    const total = raw[i] + carry;
    const isLast = i === years.length - 1;
    const overflowOut = isLast ? 0 : Math.max(0, total - y.goal);
    const alloc: YearAllocation = {
      key: y.key,
      goal: y.goal,
      raw: raw[i],
      carriedIn: carry,
      counted: isLast ? total : Math.min(total, y.goal),
      overflowOut,
    };
    carry = overflowOut;
    return alloc;
  });
  const last = out[out.length - 1];
  return {
    years: out,
    surplus: last ? Math.max(0, last.counted - last.goal) : 0,
    total: raw.reduce((a, b) => a + b, 0),
  };
}
