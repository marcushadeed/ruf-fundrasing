import { describe, expect, it } from 'vitest';
import { allocate } from './allocate';
import { totalsAt } from './metrics';
import { commitmentEvents, pledgeSchedule, horizonEnd } from './schedule';
import { pledge, wb } from './testUtil';

const pledgedOn = (w: ReturnType<typeof wb>, date = '2030-01-01') =>
  totalsAt(w, commitmentEvents(w), date).pledged;

describe('allocate', () => {
  const years = [
    { key: 'Y1', goal: 80000, fundsStart: '2026-09-01' },
    { key: 'Y2', goal: 80000, fundsStart: '2028-10-01' },
  ];

  it('rolls Y1 surplus into Y2', () => {
    const a = allocate([85000, 0], years);
    expect(a.years.map((y) => y.counted)).toEqual([80000, 5000]);
    expect(a.years[1].carriedIn).toBe(5000);
    expect(a.surplus).toBe(0);
  });

  it('never moves Y2 money back into Y1', () => {
    const a = allocate([10000, 90000], years);
    expect(a.years.map((y) => y.counted)).toEqual([10000, 90000]);
    expect(a.surplus).toBe(10000);
  });
});

describe('commitment events', () => {
  it('worked example: $85k of lump sums before Y2 -> Y1 $80k, Y2 $5k', () => {
    const w = wb({ Pledges: [pledge('A', 50000, '2026-10-01'), pledge('B', 35000, '2027-03-01')] });
    expect(pledgedOn(w).years.map((y) => y.counted)).toEqual([80000, 5000]);
  });

  it('splits a recurring pledge across the Y2 boundary by payment date', () => {
    // $200/mo from 2027-10-01 for 2 years: 12 payments before 2028-10-01, 12 after.
    const w = wb({
      Pledges: [
        pledge('R', 200, '2027-08-15', { kind: 'recurring', frequency: 'monthly', start: '2027-10-01', end: '2029-09-01' }),
      ],
    });
    expect(pledgedOn(w).years.map((y) => y.raw)).toEqual([2400, 2400]);
  });

  it('runs open-ended recurring pledges through the end of the last year', () => {
    const w = wb({
      Pledges: [pledge('R', 100, '2026-10-01', { kind: 'recurring', frequency: 'quarterly', start: '2026-10-01' })],
    });
    const p = w.pledges[0];
    const s = pledgeSchedule(p, horizonEnd(w.years));
    expect(s[0].date).toBe('2026-10-01');
    expect(s.at(-1)!.date).toBe('2029-07-01'); // last quarter before 2029-10-01
  });

  it('counts only received money for cancelled pledges', () => {
    const w = wb({
      Pledges: [pledge('C', 5000, '2026-10-01', { status: 'cancelled' })],
      Gifts: [['2026-11-01', 'Donor C', '1000', 'C', '']],
    });
    expect(pledgedOn(w).total).toBe(1000);
  });

  it('counts a standalone gift as both pledged and received', () => {
    const w = wb({ Gifts: [['2026-11-01', 'Walk-in', '$500', '', '']] });
    const t = totalsAt(w, commitmentEvents(w), '2026-12-01');
    expect(t.pledged.total).toBe(500);
    expect(t.received.total).toBe(500);
  });

  it('does not double count a gift linked to its pledge, but keeps overpayment', () => {
    const w = wb({
      Pledges: [pledge('P', 1000, '2026-10-01')],
      Gifts: [['2026-10-05', 'Donor P', '1200', 'P', '']],
    });
    expect(pledgedOn(w).total).toBe(1200);
  });

  it('respects the as-of date for commitments and receipts', () => {
    const w = wb({
      Pledges: [pledge('A', 1000, '2026-10-01'), pledge('B', 2000, '2027-01-01')],
      Gifts: [['2026-12-01', 'Donor A', '1000', 'A', '']],
    });
    const events = commitmentEvents(w);
    expect(totalsAt(w, events, '2026-11-01').pledged.total).toBe(1000);
    expect(totalsAt(w, events, '2026-11-01').received.total).toBe(0);
    expect(totalsAt(w, events, '2027-02-01').pledged.total).toBe(3000);
    expect(totalsAt(w, events, '2027-02-01').received.total).toBe(1000);
  });
});
