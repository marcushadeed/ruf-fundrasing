import { describe, expect, it } from 'vitest';
import { addMonths, parseDate } from './dates';
import { parseAmount, parseProbability, parseTarget, parseWorkbook } from './parse';
import { HEADERS, pledge, wb } from './testUtil';

describe('cell parsing', () => {
  it('parses dates in ISO, US and Sheets-serial forms', () => {
    expect(parseDate('2027-09-01')).toBe('2027-09-01');
    expect(parseDate('9/1/2027')).toBe('2027-09-01');
    expect(parseDate('9/1/27')).toBe('2027-09-01');
    expect(parseDate('46631')).toBe('2027-09-01');
    expect(parseDate('2027-02-30')).toBeNull();
    expect(parseDate('soon')).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('clamps month arithmetic to the end of the month', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2027-11-15', 3)).toBe('2028-02-15');
  });

  it('parses currency amounts', () => {
    expect(parseAmount('$1,200.50')).toBe(1200.5);
    expect(parseAmount('80000')).toBe(80000);
    expect(parseAmount('($300)')).toBe(-300);
    expect(parseAmount('abc')).toBeNull();
  });

  it('parses targets as amounts or percents', () => {
    expect(parseTarget('75%')).toEqual({ kind: 'percent', value: 0.75 });
    expect(parseTarget('$12,000')).toEqual({ kind: 'amount', value: 12000 });
    expect(parseTarget('nope')).toBeNull();
  });

  it('parses probabilities', () => {
    expect(parseProbability('30%')).toBe(0.3);
    expect(parseProbability('0.3')).toBe(0.3);
    expect(parseProbability('30')).toBe(0.3);
  });
});

describe('parseWorkbook', () => {
  it('reads config tabs and resolves defaults', () => {
    const w = wb({});
    expect(w.years.map((y) => y.key)).toEqual(['Y1', 'Y2']);
    expect(w.milestones).toHaveLength(4);
    expect(w.stages.find((s) => s.name === 'Pledged')?.open).toBe(false);
    expect(w.issues).toEqual([]);
  });

  it('allows columns in any order', () => {
    const w = parseWorkbook({
      title: 't',
      tabs: { Years: [['Funds Start', 'Goal', 'Year'], ['2026-09-01', '50000', 'Y1']] },
    });
    expect(w.years).toEqual([{ key: 'Y1', goal: 50000, fundsStart: '2026-09-01' }]);
  });

  it('reports bad rows with tab and row number instead of failing', () => {
    const w = wb({
      Pledges: [pledge('P1', 100, '2026-10-01'), pledge('P2', -5, '2026-10-01'), pledge('P1', 50, '2026-10-01')],
      Gifts: [['2026-10-02', 'X', '100', 'P404', '']],
      Pipeline: [['Sam', 'Maybe Later', '500', '', '', '', '']],
    });
    expect(w.pledges.map((p) => p.id)).toEqual(['P1']);
    expect(w.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tab: 'Pledges', row: 3 }),
        expect.objectContaining({ tab: 'Pledges', row: 4, message: expect.stringContaining('Duplicate') }),
        expect.objectContaining({ tab: 'Gifts', row: 2, message: expect.stringContaining('P404') }),
        expect.objectContaining({ tab: 'Pipeline', row: 2, message: expect.stringContaining('Maybe Later') }),
      ]),
    );
    // The gift with a bad pledge ID is still counted as a standalone gift.
    expect(w.gifts[0].pledgeId).toBeUndefined();
  });

  it('flags missing tabs and missing columns', () => {
    const w = parseWorkbook({ title: 't', tabs: { Years: [['Year', 'Goal']], Pledges: [HEADERS.Pledges] } });
    expect(w.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tab: 'Years', message: expect.stringContaining('funds start') }),
        expect.objectContaining({ tab: 'Gifts', row: 0 }),
      ]),
    );
  });

  it('rejects unknown milestone metrics and percent targets on received', () => {
    const w = wb({
      Milestones: [
        ['Bad metric', 'y3_pledged', '$10', '2027-01-01', 'goal'],
        ['Bad pct', 'received', '50%', '2027-01-01', 'goal'],
      ],
    });
    expect(w.milestones).toEqual([]);
    expect(w.issues.filter((i) => i.tab === 'Milestones')).toHaveLength(2);
  });

  it('defaults one-time expected date to committed date and requires frequency for recurring', () => {
    const w = wb({
      Pledges: [pledge('P1', 100, '2026-10-01'), pledge('P2', 100, '2026-10-01', { kind: 'recurring' })],
    });
    expect(w.pledges[0].start).toBe('2026-10-01');
    expect(w.pledges).toHaveLength(1);
    expect(w.issues[0].message).toContain('Frequency');
  });
});
