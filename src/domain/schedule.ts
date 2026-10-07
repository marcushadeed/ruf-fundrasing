import { addMonths } from './dates';
import type { Frequency, Gift, ISODate, Pledge, Workbook, Year } from './types';

/** One dated chunk of committed money. */
export interface MoneyEvent {
  /** When the money arrives; decides which year it funds. */
  date: ISODate;
  amount: number;
  /** When it became committed; decides whether it counts "as of" a date. */
  committedOn: ISODate;
  donor: string;
  pledgeId?: string;
}

const STEP_MONTHS: Record<Frequency, number> = { monthly: 1, quarterly: 3, annually: 12 };

/** Exclusive end of the last year's money period (its start + 12 months). */
export function horizonEnd(years: Year[]): ISODate | null {
  if (years.length === 0) return null;
  return addMonths(years[years.length - 1].fundsStart, 12);
}

/** Expected payments for a pledge. Open-ended recurring pledges stop at the horizon. */
export function pledgeSchedule(p: Pledge, horizon: ISODate | null): { date: ISODate; amount: number }[] {
  if (p.kind === 'one-time' || !p.frequency) return [{ date: p.start, amount: p.amount }];
  const step = STEP_MONTHS[p.frequency];
  const out: { date: ISODate; amount: number }[] = [];
  for (let i = 0; i < 1200; i++) {
    const date = addMonths(p.start, i * step);
    if (p.end ? date > p.end : !horizon || date >= horizon) break;
    out.push({ date, amount: p.amount });
  }
  return out;
}

/**
 * Everything that counts as "pledged":
 * - active pledges -> their schedule (plus any amount received beyond it)
 * - cancelled pledges -> only what was actually received against them
 * - gifts without a pledge -> committed and paid on the gift date
 */
export function commitmentEvents(wb: Pick<Workbook, 'pledges' | 'gifts' | 'years'>): MoneyEvent[] {
  const horizon = horizonEnd(wb.years);
  const linked = new Map<string, Gift[]>();
  const events: MoneyEvent[] = [];

  for (const g of wb.gifts) {
    if (g.pledgeId) {
      linked.set(g.pledgeId, [...(linked.get(g.pledgeId) ?? []), g]);
    } else {
      events.push({ date: g.date, amount: g.amount, committedOn: g.date, donor: g.donor });
    }
  }

  for (const p of wb.pledges) {
    const gifts = (linked.get(p.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    if (p.status === 'cancelled') {
      for (const g of gifts) {
        events.push({ date: g.date, amount: g.amount, committedOn: g.date, donor: p.donor, pledgeId: p.id });
      }
      continue;
    }
    const schedule = pledgeSchedule(p, horizon);
    for (const s of schedule) {
      events.push({ ...s, committedOn: p.committedOn, donor: p.donor, pledgeId: p.id });
    }
    const excess =
      gifts.reduce((sum, g) => sum + g.amount, 0) - schedule.reduce((sum, s) => sum + s.amount, 0);
    if (excess > 0.005) {
      const last = gifts[gifts.length - 1].date;
      events.push({ date: last, amount: excess, committedOn: last, donor: p.donor, pledgeId: p.id });
    }
  }
  return events;
}
