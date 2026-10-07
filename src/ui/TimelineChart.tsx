import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fromDayNumber, toDayNumber } from '../domain/dates';
import type { MilestoneStatus } from '../domain/metrics';
import type { Timeline, TimelinePoint } from '../domain/timeline';
import type { ISODate } from '../domain/types';
import { fmtDate, metricColor, metricLabel, money, shortMoney } from './format';

const TICK = { fontSize: 12, fill: 'var(--text-3)' };

export function TimelineChart(props: {
  timeline: Timeline;
  milestones: MilestoneStatus[];
  asOf: ISODate;
  today: ISODate;
  yearKeys: string[];
}) {
  const { timeline, milestones, asOf, today, yearKeys } = props;
  // Keep long projections from squashing the actual lines: cap the axis a bit above the targets.
  const actualMax = Math.max(0, ...timeline.points.flatMap((p) => timeline.metrics.map((m) => Number(p[m] ?? 0))));
  const yMax = Math.max(actualMax, ...milestones.map((m) => m.target)) * 1.15 || 1000;
  const color = (m: string) => metricColor(m, yearKeys);

  return (
    <div className="card chart-card">
      <ul className="legend">
        {timeline.metrics.map((m) => (
          <li key={m}>
            <i className="swatch swatch-line" style={{ background: color(m) }} />
            {metricLabel(m)}
          </li>
        ))}
        <li className="muted">
          <svg width="18" height="4" aria-hidden>
            <line x1="0" y1="2" x2="18" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
          </svg>
          At current pace
        </li>
        <li className="muted">
          <svg width="12" height="12" aria-hidden>
            <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
          Milestone (filled once met)
        </li>
      </ul>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={timeline.points} margin={{ top: 28, right: 56, left: 6, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="day"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(d: number) =>
              new Date(d * 86_400_000).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: '2-digit' })
            }
            minTickGap={48}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={TICK}
          />
          <YAxis
            tickFormatter={(v: number) => shortMoney(v)}
            width={56}
            domain={[0, yMax]}
            allowDataOverflow
            axisLine={false}
            tickLine={false}
            tickMargin={6}
            tick={TICK}
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltip point={payload[0].payload as TimelinePoint} metrics={timeline.metrics} color={color} />
              ) : null
            }
            cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
          />
          {timeline.metrics.flatMap((m) => [
            <Line
              key={m}
              dataKey={m}
              name={metricLabel(m)}
              stroke={color(m)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
              isAnimationActive={false}
            />,
            <Line
              key={`${m}_proj`}
              dataKey={`${m}_proj`}
              name={`${metricLabel(m)} (pace)`}
              stroke={color(m)}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeOpacity={0.55}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />,
          ])}
          <ReferenceLine
            x={toDayNumber(asOf)}
            stroke="var(--text-3)"
            strokeDasharray="2 3"
            label={{ value: asOf === today ? 'Today' : fmtDate(asOf), position: 'top', fontSize: 11, fill: 'var(--text-3)' }}
          />
          {milestones.map((m) => (
            <ReferenceDot
              key={`${m.milestone.label}-${m.milestone.due}`}
              x={toDayNumber(m.milestone.due)}
              y={m.target}
              r={6}
              fill={m.state === 'met' ? color(m.milestone.metric) : 'var(--surface)'}
              stroke={color(m.milestone.metric)}
              strokeWidth={2}
              label={{ value: m.milestone.label, position: 'top', fontSize: 11, fill: 'var(--text-2)' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="chart-caption">
        Solid lines are actual totals. Dashed lines continue at your trailing 60-day pace. Hover anywhere for exact
        numbers.
      </p>
    </div>
  );
}

function ChartTooltip(props: { point: TimelinePoint; metrics: string[]; color: (m: string) => string }) {
  const { point, metrics, color } = props;
  const rows = metrics
    .map((m) => {
      const actual = point[m];
      const proj = point[`${m}_proj`];
      const value = typeof actual === 'number' ? actual : typeof proj === 'number' ? proj : undefined;
      return value === undefined ? null : { m, value, projected: typeof actual !== 'number' };
    })
    .filter((r) => r !== null);
  return (
    <div className="chart-tooltip">
      <div className="tt-date">
        {fmtDate(fromDayNumber(point.day))}
        {rows.some((r) => r.projected) && ' · projected'}
      </div>
      {rows.map((r) => (
        <div key={r.m} className="tt-row">
          <i className="swatch swatch-line" style={{ background: color(r.m) }} />
          <span>{metricLabel(r.m)}</span>
          <strong>{money(r.value)}</strong>
        </div>
      ))}
    </div>
  );
}
