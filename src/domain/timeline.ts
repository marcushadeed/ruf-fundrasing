import { addDays, toDayNumber } from './dates';
import { metricCap, metricValue, NO_WHAT_IF, pacePerDay, totalsAt, type WhatIf } from './metrics';
import { commitmentEvents } from './schedule';
import type { ISODate, Workbook } from './types';

export interface TimelinePoint {
  /** Days since epoch, for a numeric/time x-axis. */
  day: number;
  date: ISODate;
  /** `<metric>` = actual value (dates <= asOf); `<metric>_proj` = pace projection (dates >= asOf). */
  [series: string]: number | string | undefined;
}

export interface Timeline {
  points: TimelinePoint[];
  metrics: string[];
}

/** Metrics worth charting: received plus each year's pledged. */
export function chartMetrics(wb: Workbook): string[] {
  return [...wb.years.map((y) => `${y.key.toLowerCase()}_pledged`), 'received'];
}

/** From first activity (or 30 days before `asOf`) to just past the last milestone. */
export function timelineBounds(wb: Workbook, asOf: ISODate): { start: ISODate; end: ISODate } {
  const events = commitmentEvents(wb);
  const firstActivity = [...events.map((e) => e.committedOn), ...wb.gifts.map((g) => g.date)].sort()[0];
  const start = firstActivity && firstActivity < asOf ? firstActivity : addDays(asOf, -30);
  const lastDue = wb.milestones.map((m) => m.due).sort().at(-1);
  const end = lastDue && lastDue > asOf ? addDays(lastDue, 14) : addDays(asOf, 30);
  return { start, end };
}

/**
 * Weekly cumulative history up to `asOf`, then a straight-line projection at the
 * trailing pace through the last milestone. `asOf` and each due date are always
 * included so markers and the projection line up exactly.
 */
export function buildTimeline(wb: Workbook, asOf: ISODate, whatIf: WhatIf = NO_WHAT_IF): Timeline {
  const metrics = chartMetrics(wb);
  const events = commitmentEvents(wb);
  const { start, end } = timelineBounds(wb, asOf);

  const dates = new Set<ISODate>([asOf, ...wb.milestones.map((m) => m.due)]);
  for (let d = start; d <= end; d = addDays(d, 7)) dates.add(d);
  const sorted = [...dates].filter((d) => d >= start && d <= end).sort();

  const now = totalsAt(wb, events, asOf, whatIf.extraPledges);
  const base = Object.fromEntries(metrics.map((m) => [m, metricValue(m, now)]));
  const pace = Object.fromEntries(metrics.map((m) => [m, pacePerDay(wb, events, m, asOf)]));

  const points = sorted.map((date): TimelinePoint => {
    const point: TimelinePoint = { day: toDayNumber(date), date };
    if (date <= asOf) {
      const t = date === asOf ? now : totalsAt(wb, events, date);
      for (const m of metrics) point[m] = metricValue(m, t);
    }
    if (date >= asOf) {
      const days = toDayNumber(date) - toDayNumber(asOf);
      for (const m of metrics) point[`${m}_proj`] = Math.min(metricCap(m, wb.years), base[m] + pace[m] * days);
    }
    return point;
  });
  return { points, metrics };
}
