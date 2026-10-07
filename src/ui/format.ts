import { toDayNumber } from '../domain/dates';
import type { ISODate } from '../domain/types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const money = (n: number) => usd.format(Math.round(n));

export function shortMoney(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return money(n);
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function fmtDate(date: ISODate | undefined): string {
  if (!date) return '';
  return new Date(toDayNumber(date) * 86_400_000).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function fmtDays(days: number): string {
  if (days === 0) return 'due today';
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} ago`;
  if (days < 60) return `${days} day${days === 1 ? '' : 's'} left`;
  return `${Math.round(days / 7)} weeks left`;
}

const PALETTE = ['#2563eb', '#7c3aed', '#db2777', '#ea580c'];

/** Stable color per chart metric. */
export function metricColor(metric: string, years: string[]): string {
  if (metric === 'received') return '#16a34a';
  const i = years.findIndex((y) => metric.startsWith(`${y.toLowerCase()}_`));
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
}

export function metricLabel(metric: string): string {
  if (metric === 'received') return 'Received';
  const [year, kind] = metric.split('_');
  return `${year.toUpperCase()} ${kind}`;
}
