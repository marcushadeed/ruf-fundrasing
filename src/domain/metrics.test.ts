import { describe, expect, it } from 'vitest';
import { NO_WHAT_IF, snapshot } from './metrics';
import { buildTimeline } from './timeline';
import { donorRows, pledgeRows } from './ledger';
import { pledge, wb } from './testUtil';

const byLabel = (s: ReturnType<typeof snapshot>, label: string) =>
  s.milestones.find((m) => m.milestone.label === label)!;

describe('snapshot milestones', () => {
  it('resolves percent targets against the year goal', () => {
    const s = snapshot(wb({}), '2026-10-06');
    expect(byLabel(s, 'Y1 minimum (75%)').target).toBe(60000);
    expect(byLabel(s, 'Y1 fully pledged').target).toBe(80000);
    expect(byLabel(s, 'Cash on hand').target).toBe(12000);
  });

  it('marks met, on-track and at-risk from value and trailing pace', () => {
    // $30k committed over the last 60 days = $500/day. 330 days left to 2027-09-01.
    const w = wb({
      Pledges: [pledge('A', 15000, '2026-08-20'), pledge('B', 15000, '2026-09-20')],
      Gifts: [['2026-09-25', 'Donor A', '15000', 'A', '']],
    });
    const s = snapshot(w, '2026-10-06');
    expect(byLabel(s, 'Cash on hand').state).toBe('met');
    expect(byLabel(s, 'Y1 minimum (75%)').state).toBe('on-track');
    expect(byLabel(s, 'Y2 fully pledged').value).toBe(0);
    const slow = snapshot(wb({ Pledges: [pledge('A', 1000, '2026-10-01')] }), '2026-10-06');
    expect(byLabel(slow, 'Y1 minimum (75%)').state).toBe('at-risk');
  });

  it('computes required weekly pace', () => {
    const s = snapshot(wb({ Pledges: [pledge('A', 10000, '2026-10-01')] }), '2027-08-04');
    // 28 days left, $50k remaining to $60k -> $12,500/week.
    expect(byLabel(s, 'Y1 minimum (75%)').requiredPerWeek).toBeCloseTo(12500);
  });

  it('freezes value at the due date once past it', () => {
    const w = wb({ Pledges: [pledge('A', 10000, '2026-10-01'), pledge('B', 70000, '2027-09-15')] });
    const s = snapshot(w, '2027-09-20');
    const min = byLabel(s, 'Y1 minimum (75%)');
    expect(min.state).toBe('missed');
    expect(min.value).toBe(10000);
    expect(byLabel(s, 'Y1 fully pledged').state).toBe('met');
  });

  it('adds weighted pipeline as a separate likely layer', () => {
    const w = wb({
      Pledges: [pledge('A', 70000, '2026-10-01')],
      Pipeline: [
        ['Sam', 'Considering', '$10,000', '', '', '', ''], // 60% -> 6000
        ['Pat', 'Declined', '$5,000', '', '', '', ''], // closed -> 0
      ],
    });
    const s = snapshot(w, '2026-10-06');
    expect(s.pipeline.weighted).toBe(6000);
    expect(s.years[0].pledged).toBe(70000);
    expect(s.years[0].likely).toBe(76000);
    expect(byLabel(s, 'Y1 fully pledged').pipelineBoost).toBe(6000);
  });

  it('applies what-if conversion override and extra pledges', () => {
    const w = wb({
      Pledges: [pledge('A', 70000, '2026-10-01')],
      Pipeline: [['Sam', 'Asked', '$10,000', '', '', '', '']],
    });
    const s = snapshot(w, '2026-10-06', {
      conversionOverride: 1,
      extraPledges: [{ amount: 15000, date: '2027-01-01' }],
    });
    expect(s.pipeline.weighted).toBe(10000);
    expect(s.years.map((y) => y.pledged)).toEqual([80000, 5000]);
    expect(s.years.map((y) => y.likely)).toEqual([80000, 15000]);
  });
});

describe('timeline', () => {
  it('has history up to as-of and projections after, including due dates', () => {
    const w = wb({ Pledges: [pledge('A', 6000, '2026-08-08')] }); // $100/day over the trailing 60 days
    const t = buildTimeline(w, '2026-10-06', NO_WHAT_IF);
    const now = t.points.find((p) => p.date === '2026-10-06')!;
    expect(now.y1_pledged).toBe(6000);
    expect(now.y1_pledged_proj).toBe(6000);
    const due = t.points.find((p) => p.date === '2027-09-01')!;
    expect(due.y1_pledged).toBeUndefined();
    expect(due.y1_pledged_proj).toBeCloseTo(6000 + 100 * 330);
  });
});

describe('ledger', () => {
  it('breaks pledges down by year and rolls up donors', () => {
    const w = wb({
      Pledges: [
        pledge('R', 100, '2027-09-01', { donor: 'Kim', kind: 'recurring', frequency: 'annually', start: '2028-01-01', end: '2029-01-01' }),
      ],
      Gifts: [
        ['2028-01-03', 'Kim', '100', 'R', ''],
        ['2026-12-01', 'kim ', '50', '', ''],
      ],
    });
    expect(pledgeRows(w)[0].byYear).toEqual([100, 100]);
    expect(pledgeRows(w)[0].received).toBe(100);
    expect(donorRows(w)).toEqual([{ donor: 'Kim', pledged: 250, received: 150, pledgeCount: 1, giftCount: 2 }]);
  });
});

describe('sample data', () => {
  it('parses cleanly and produces a sensible snapshot', async () => {
    const { sampleWorkbook } = await import('../data/sample');
    const { parseWorkbook } = await import('./parse');
    const w = parseWorkbook(sampleWorkbook('2026-10-06'));
    expect(w.issues).toEqual([]);
    const s = snapshot(w, '2026-10-06');
    expect(s.totalReceived).toBe(8850);
    expect(s.years[1].pledged).toBeGreaterThan(0); // recurring + Y2-only pledges
    expect(s.pipeline.openCount).toBe(9);
  });
});

describe('projection caps', () => {
  it('never projects a non-final year past its goal', () => {
    const w = wb({ Pledges: [pledge('A', 60000, '2026-09-01')] }); // huge trailing pace
    const s = snapshot(w, '2026-10-06');
    expect(s.milestones.find((m) => m.milestone.label === 'Y1 fully pledged')!.projectedAtDue).toBe(80000);
    const t = buildTimeline(w, '2026-10-06');
    expect(Math.max(...t.points.map((p) => Number(p.y1_pledged_proj ?? 0)))).toBe(80000);
  });
});
