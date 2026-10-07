import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fromDayNumber, toDayNumber } from '../domain/dates';
import type { MilestoneStatus } from '../domain/metrics';
import type { Timeline } from '../domain/timeline';
import type { ISODate } from '../domain/types';
import { fmtDate, metricColor, metricLabel, money, shortMoney } from './format';

export function TimelineChart(props: {
  timeline: Timeline;
  milestones: MilestoneStatus[];
  asOf: ISODate;
  yearKeys: string[];
}) {
  const { timeline, milestones, asOf, yearKeys } = props;
  // Keep long projections from squashing the actual lines: cap the axis a bit above the targets.
  const actualMax = Math.max(0, ...timeline.points.flatMap((p) => timeline.metrics.map((m) => Number(p[m] ?? 0))));
  const yMax = Math.max(actualMax, ...milestones.map((m) => m.target)) * 1.15 || 1000;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={timeline.points} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
          <XAxis
            dataKey="day"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(d: number) => fmtDate(fromDayNumber(d))}
            minTickGap={40}
          />
          <YAxis tickFormatter={(v: number) => shortMoney(v)} width={60} domain={[0, yMax]} allowDataOverflow />
          <Tooltip
            labelFormatter={(d) => fmtDate(fromDayNumber(Number(d)))}
            formatter={(v, name) => [money(Number(v)), String(name)]}
          />
          <Legend />
          {timeline.metrics.flatMap((m) => [
            <Line
              key={m}
              dataKey={m}
              name={metricLabel(m)}
              stroke={metricColor(m, yearKeys)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />,
            <Line
              key={`${m}_proj`}
              dataKey={`${m}_proj`}
              name={`${metricLabel(m)} (pace)`}
              stroke={metricColor(m, yearKeys)}
              strokeDasharray="6 4"
              strokeOpacity={0.6}
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />,
          ])}
          <ReferenceLine x={toDayNumber(asOf)} stroke="#888" label={{ value: 'as of', position: 'top' }} />
          {milestones.map((m) => (
            <ReferenceDot
              key={`${m.milestone.label}-${m.milestone.due}`}
              x={toDayNumber(m.milestone.due)}
              y={m.target}
              r={6}
              fill={m.state === 'met' ? '#16a34a' : m.state === 'missed' ? '#dc2626' : '#f59e0b'}
              stroke="white"
              label={{ value: m.milestone.label, position: 'top', fontSize: 11 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="muted small">
        Solid = actual. Dashed = projection at the trailing 60-day pace. Dots = milestone targets on their due dates.
      </p>
    </div>
  );
}
