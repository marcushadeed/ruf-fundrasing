import { bucketByYear } from './allocate';
import { commitmentEvents } from './schedule';
import type { Pledge, Workbook } from './types';

export interface PledgeRow {
  pledge: Pledge;
  /** Scheduled/committed amount landing in each year's period (before roll-over). */
  byYear: number[];
  total: number;
  received: number;
}

export interface DonorRow {
  donor: string;
  pledged: number;
  received: number;
  pledgeCount: number;
  giftCount: number;
}

export function pledgeRows(wb: Workbook): PledgeRow[] {
  const events = commitmentEvents(wb);
  return wb.pledges.map((pledge) => {
    const own = events.filter((e) => e.pledgeId === pledge.id);
    const byYear = bucketByYear(own, wb.years);
    return {
      pledge,
      byYear,
      total: byYear.reduce((a, b) => a + b, 0),
      received: wb.gifts.filter((g) => g.pledgeId === pledge.id).reduce((s, g) => s + g.amount, 0),
    };
  });
}

/** Per-donor rollup. Donor names are matched case-insensitively. */
export function donorRows(wb: Workbook): DonorRow[] {
  const map = new Map<string, DonorRow>();
  const row = (name: string) => {
    const key = name.trim().toLowerCase();
    if (!map.has(key)) map.set(key, { donor: name.trim(), pledged: 0, received: 0, pledgeCount: 0, giftCount: 0 });
    return map.get(key)!;
  };
  // Pledges first so the donor's display name comes from the Pledges tab.
  for (const p of wb.pledges) row(p.donor).pledgeCount++;
  for (const e of commitmentEvents(wb)) row(e.donor).pledged += e.amount;
  for (const g of wb.gifts) {
    const r = row(g.donor);
    r.received += g.amount;
    r.giftCount++;
  }
  return [...map.values()].sort((a, b) => b.pledged - a.pledged);
}
