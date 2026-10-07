import { allocate, bucketByYear, yearIndexFor, type Allocation } from './allocate';
import { addDays, daysBetween } from './dates';
import { commitmentEvents, type MoneyEvent } from './schedule';
import type { Ask, ISODate, Milestone, Workbook, Year } from './types';

export const PACE_WINDOW_DAYS = 60;

/** Hypotheticals layered on top of the sheet. Never written back. */
export interface WhatIf {
  /** Replace every open stage's probability with this (0..1); null = use the Stages tab. */
  conversionOverride: number | null;
  /** Extra pledges, committed now, whose money arrives on `date`. */
  extraPledges: { amount: number; date: ISODate }[];
}

export const NO_WHAT_IF: WhatIf = { conversionOverride: null, extraPledges: [] };

export interface Totals {
  pledged: Allocation;
  received: Allocation;
}

/** Pledged (committed by `date`) and received (paid by `date`) amounts, per year. */
export function totalsAt(
  wb: Workbook,
  events: MoneyEvent[],
  date: ISODate,
  extra: { amount: number; date: ISODate }[] = [],
): Totals {
  const committed = events.filter((e) => e.committedOn <= date);
  const pledgedRaw = bucketByYear([...committed, ...extra], wb.years);
  const receivedRaw = bucketByYear(
    wb.gifts.filter((g) => g.date <= date),
    wb.years,
  );
  return { pledged: allocate(pledgedRaw, wb.years), received: allocate(receivedRaw, wb.years) };
}

export function metricValue(metric: string, totals: Totals): number {
  if (metric === 'received') return totals.received.total;
  const m = /^(.+)_(pledged|received)$/.exec(metric);
  if (!m) return 0;
  const alloc = m[2] === 'pledged' ? totals.pledged : totals.received;
  return alloc.years.find((y) => y.key.toLowerCase() === m[1])?.counted ?? 0;
}

/**
 * Highest value a metric can reach: a year's counted amount is capped at its goal
 * (surplus rolls forward) except for the last year. Used to cap projections.
 */
export function metricCap(metric: string, years: Year[]): number {
  const key = metric.replace(/_(pledged|received)$/, '');
  const i = years.findIndex((y) => y.key.toLowerCase() === key);
  return i >= 0 && i < years.length - 1 ? years[i].goal : Infinity;
}

export function resolveTarget(m: Milestone, years: Year[]): number {
  if (m.target.kind === 'amount') return m.target.value;
  const key = m.metric.replace(/_(pledged|received)$/, '');
  const year = years.find((y) => y.key.toLowerCase() === key);
  return year ? year.goal * m.target.value : 0;
}

export interface StageSummary {
  stage: string;
  open: boolean;
  probability: number;
  count: number;
  total: number;
  weighted: number;
}

export interface PipelineSummary {
  openCount: number;
  openTotal: number;
  weighted: number;
  byStage: StageSummary[];
}

export function askProbability(ask: Ask, wb: Workbook, whatIf: WhatIf): number {
  const stage = wb.stages.find((s) => s.name === ask.stage);
  if (!stage?.open) return 0;
  return whatIf.conversionOverride ?? stage.probability;
}

export function pipelineSummary(wb: Workbook, whatIf: WhatIf): PipelineSummary {
  const byStage: StageSummary[] = wb.stages.map((s) => {
    const asks = wb.asks.filter((a) => a.stage === s.name);
    const probability = s.open ? (whatIf.conversionOverride ?? s.probability) : 0;
    const total = asks.reduce((sum, a) => sum + a.askAmount, 0);
    return { stage: s.name, open: s.open, probability, count: asks.length, total, weighted: total * probability };
  });
  const open = byStage.filter((s) => s.open);
  return {
    openCount: open.reduce((n, s) => n + s.count, 0),
    openTotal: open.reduce((n, s) => n + s.total, 0),
    weighted: open.reduce((n, s) => n + s.weighted, 0),
    byStage,
  };
}

export type MilestoneState = 'met' | 'on-track' | 'at-risk' | 'missed';

export interface MilestoneStatus {
  milestone: Milestone;
  target: number;
  /** Value now, or frozen at the due date once it has passed. */
  value: number;
  pct: number;
  daysLeft: number;
  state: MilestoneState;
  pacePerWeek: number;
  requiredPerWeek: number;
  /** Value + current pace through the due date (ignores pipeline). */
  projectedAtDue: number;
  /** Extra expected from the weighted pipeline (pledged metrics only). */
  pipelineBoost: number;
}

export interface YearStatus {
  key: string;
  goal: number;
  fundsStart: ISODate;
  pledged: number;
  received: number;
  /** Pledged + weighted pipeline. */
  likely: number;
  carriedIn: number;
  overflowOut: number;
}

export interface Snapshot {
  asOf: ISODate;
  years: YearStatus[];
  totalPledged: number;
  totalReceived: number;
  /** Pledged beyond the last year's goal. */
  surplus: number;
  milestones: MilestoneStatus[];
  pipeline: PipelineSummary;
}

/** Per-day growth of a metric over the trailing window ending at `date`. */
export function pacePerDay(wb: Workbook, events: MoneyEvent[], metric: string, date: ISODate): number {
  const now = metricValue(metric, totalsAt(wb, events, date));
  const before = metricValue(metric, totalsAt(wb, events, addDays(date, -PACE_WINDOW_DAYS)));
  return Math.max(0, (now - before) / PACE_WINDOW_DAYS);
}

/** Weighted pipeline is assumed to arrive soon, so it lands in the year containing `asOf`. */
function likelyAllocation(wb: Workbook, totals: Totals, asOf: ISODate, weighted: number): Allocation {
  const raw = totals.pledged.years.map((y) => y.raw);
  if (raw.length) raw[yearIndexFor(asOf, wb.years)] += weighted;
  return allocate(raw, wb.years);
}

export function snapshot(wb: Workbook, asOf: ISODate, whatIf: WhatIf = NO_WHAT_IF): Snapshot {
  const events = commitmentEvents(wb);
  const totals = totalsAt(wb, events, asOf, whatIf.extraPledges);
  const pipeline = pipelineSummary(wb, whatIf);
  const likely = likelyAllocation(wb, totals, asOf, pipeline.weighted);
  const likelyTotals: Totals = { pledged: likely, received: totals.received };

  const milestones = wb.milestones.map((m): MilestoneStatus => {
    const target = resolveTarget(m, wb.years);
    const daysLeft = daysBetween(asOf, m.due);
    const pace = pacePerDay(wb, events, m.metric, asOf);
    if (daysLeft < 0) {
      const atDue = metricValue(m.metric, totalsAt(wb, events, m.due, whatIf.extraPledges));
      return {
        milestone: m, target, value: atDue, pct: target ? atDue / target : 0, daysLeft,
        state: atDue >= target ? 'met' : 'missed',
        pacePerWeek: pace * 7, requiredPerWeek: 0, projectedAtDue: atDue, pipelineBoost: 0,
      };
    }
    const value = metricValue(m.metric, totals);
    const projectedAtDue = Math.min(metricCap(m.metric, wb.years), value + pace * daysLeft);
    const remaining = Math.max(0, target - value);
    return {
      milestone: m,
      target,
      value,
      pct: target ? value / target : 0,
      daysLeft,
      state: value >= target ? 'met' : projectedAtDue >= target ? 'on-track' : 'at-risk',
      pacePerWeek: pace * 7,
      requiredPerWeek: remaining === 0 ? 0 : (remaining / Math.max(1, daysLeft)) * 7,
      projectedAtDue,
      pipelineBoost: Math.max(0, metricValue(m.metric, likelyTotals) - value),
    };
  });

  return {
    asOf,
    years: wb.years.map((y, i) => ({
      key: y.key,
      goal: y.goal,
      fundsStart: y.fundsStart,
      pledged: totals.pledged.years[i].counted,
      received: totals.received.years[i].counted,
      likely: likely.years[i].counted,
      carriedIn: totals.pledged.years[i].carriedIn,
      overflowOut: totals.pledged.years[i].overflowOut,
    })),
    totalPledged: totals.pledged.total,
    totalReceived: totals.received.total,
    surplus: totals.pledged.surplus,
    milestones,
    pipeline,
  };
}
