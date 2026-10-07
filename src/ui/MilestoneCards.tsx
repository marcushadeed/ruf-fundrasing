import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import type { MilestoneState, MilestoneStatus } from '../domain/metrics';
import { fmtDate, fmtDays, metricColor, metricLabel, money, pct } from './format';

const STATE_LABEL: Record<MilestoneState, { icon: string; text: string }> = {
  met: { icon: '✓', text: 'Met' },
  'on-track': { icon: '↗', text: 'On track' },
  'at-risk': { icon: '!', text: 'At risk' },
  missed: { icon: '✕', text: 'Missed' },
};

export function StatusTag({ state }: { state: MilestoneState }) {
  const { icon, text } = STATE_LABEL[state];
  return (
    <span className={`status status-${state}`}>
      <span aria-hidden>{icon}</span>
      {text}
    </span>
  );
}

const CELEBRATED_KEY = 'ruf-dashboard:celebrated';

function celebratedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Fires confetti the first time each milestone is seen as met (per browser). */
export function useCelebrate(milestones: MilestoneStatus[], enabled: boolean, scope: string) {
  useEffect(() => {
    if (!enabled) return;
    const seen = celebratedSet();
    const fresh = milestones.filter((m) => {
      const key = `${scope}|${m.milestone.label}|${m.milestone.due}`;
      if (m.state !== 'met' || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!fresh.length) return;
    try {
      localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...seen]));
    } catch {
      // Without storage we'd celebrate on every load; acceptable.
    }
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.3 },
      colors: ['#f0621f', '#83610a', '#202020', '#ebe6dd', '#ffb38a'],
    });
  }, [milestones, enabled, scope]);
}

export function MilestoneCards(props: { milestones: MilestoneStatus[]; yearKeys: string[] }) {
  if (!props.milestones.length) return <p className="muted">No milestones defined. Add rows to the Milestones tab.</p>;

  return (
    <div className="grid-2">
      {props.milestones.map((m) => (
        <MilestoneCard key={`${m.milestone.label}-${m.milestone.due}`} m={m} yearKeys={props.yearKeys} />
      ))}
    </div>
  );
}

export function MilestoneCard({ m, yearKeys }: { m: MilestoneStatus; yearKeys: string[] }) {
  const filled = Math.min(100, m.pct * 100);
  const likely = Math.max(0, Math.min(100 - filled, (m.pipelineBoost / m.target) * 100));
  const open = m.daysLeft >= 0 && m.state !== 'met';

  return (
    <article className="card" style={{ ['--series' as string]: metricColor(m.milestone.metric, yearKeys) }}>
      <div className="card-top">
        <span className="eyebrow">
          {m.milestone.kind === 'minimum' ? 'Minimum' : 'Goal'} · {metricLabel(m.milestone.metric)}
        </span>
        <StatusTag state={m.state} />
      </div>
      <h3 className="card-title">{m.milestone.label}</h3>
      <div className="figure">
        <span className="figure-value">{money(m.value)}</span>
        <span className="figure-of">
          of {money(m.target)} · {pct(m.pct)}
        </span>
      </div>
      <div
        className="meter"
        role="img"
        aria-label={`${pct(m.pct)} of target${m.pipelineBoost > 0 ? `, plus ${money(m.pipelineBoost)} likely` : ''}`}
      >
        <div className="meter-fill" style={{ width: `${filled}%` }} />
        {likely > 0 && (
          <div className="meter-likely hatch" style={{ width: `${likely}%` }} title={`+${money(m.pipelineBoost)} likely from pipeline`} />
        )}
      </div>
      <dl className="facts">
        <dt>Due</dt>
        <dd>
          {fmtDate(m.milestone.due)} · {fmtDays(m.daysLeft)}
        </dd>
        {open && (
          <>
            <dt>Needed</dt>
            <dd>{money(m.requiredPerWeek)} a week</dd>
            <dt>Your pace</dt>
            <dd>
              {money(m.pacePerWeek)} a week → {money(m.projectedAtDue)} by the due date
            </dd>
            {m.pipelineBoost > 0 && (
              <>
                <dt>Pipeline</dt>
                <dd>+{money(m.pipelineBoost)} likely</dd>
              </>
            )}
          </>
        )}
      </dl>
    </article>
  );
}
