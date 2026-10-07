import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import type { MilestoneState, MilestoneStatus } from '../domain/metrics';
import { fmtDate, fmtDays, metricLabel, money, pct } from './format';

const STATE_LABEL: Record<MilestoneState, string> = {
  met: 'Met 🎉',
  'on-track': 'On track',
  'at-risk': 'At risk',
  missed: 'Missed',
};

const CELEBRATED_KEY = 'ruf-dashboard:celebrated';

function celebratedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Fires confetti the first time each milestone is seen as met (per browser). */
function useCelebrate(milestones: MilestoneStatus[], enabled: boolean, scope: string) {
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
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.3 } });
  }, [milestones, enabled, scope]);
}

export function MilestoneCards(props: {
  milestones: MilestoneStatus[];
  /** Only celebrate real, current progress (not scrubbing or what-ifs). */
  celebrate: boolean;
  scope: string;
}) {
  useCelebrate(props.milestones, props.celebrate, props.scope);
  if (!props.milestones.length) return <p className="muted">No milestones defined. Add rows to the Milestones tab.</p>;

  return (
    <div className="cards">
      {props.milestones.map((m) => (
        <article key={`${m.milestone.label}-${m.milestone.due}`} className={`card state-${m.state}`}>
          <header>
            <h3>{m.milestone.label}</h3>
            <span className={`chip chip-${m.state}`}>{STATE_LABEL[m.state]}</span>
          </header>
          <div className="big">
            {money(m.value)} <span className="muted">/ {money(m.target)}</span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${Math.min(100, m.pct * 100)}%` }} />
            {m.pipelineBoost > 0 && (
              <div
                className="bar-likely"
                style={{
                  left: `${Math.min(100, m.pct * 100)}%`,
                  width: `${Math.max(0, Math.min(100 - m.pct * 100, (m.pipelineBoost / m.target) * 100))}%`,
                }}
                title={`+${money(m.pipelineBoost)} likely from pipeline`}
              />
            )}
          </div>
          <dl className="facts">
            <dt>Progress</dt>
            <dd>{pct(m.pct)} of {metricLabel(m.milestone.metric)}</dd>
            <dt>Due</dt>
            <dd>
              {fmtDate(m.milestone.due)} · {fmtDays(m.daysLeft)}
            </dd>
            {m.daysLeft >= 0 && m.state !== 'met' && (
              <>
                <dt>Need</dt>
                <dd>{money(m.requiredPerWeek)}/week</dd>
                <dt>Pace</dt>
                <dd>
                  {money(m.pacePerWeek)}/week → {money(m.projectedAtDue)} by due date
                </dd>
                {m.pipelineBoost > 0 && (
                  <>
                    <dt>Pipeline</dt>
                    <dd>+{money(m.pipelineBoost)} likely</dd>
                  </>
                )}
              </>
            )}
            <dt>Type</dt>
            <dd>{m.milestone.kind === 'minimum' ? 'Minimum acceptable' : 'Goal'}</dd>
          </dl>
        </article>
      ))}
    </div>
  );
}
