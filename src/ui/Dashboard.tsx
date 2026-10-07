import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { todayISO } from '../domain/dates';
import { NO_WHAT_IF, snapshot, type MilestoneStatus, type Snapshot, type WhatIf } from '../domain/metrics';
import { buildTimeline, timelineBounds } from '../domain/timeline';
import type { Workbook } from '../domain/types';
import { ViewBar } from './Controls';
import { money, pct } from './format';
import { IssuesPanel } from './IssuesPanel';
import { LedgerTables } from './LedgerTables';
import { MilestoneCard, MilestoneCards, useCelebrate } from './MilestoneCards';
import { PipelineBoard } from './PipelineBoard';
import { TimelineChart } from './TimelineChart';
import type { PageId } from './usePage';
import { YearProgress } from './YearProgress';

export function Dashboard({ workbook, page, scope }: { workbook: Workbook; page: PageId; scope: string }) {
  const today = todayISO();
  const [asOf, setAsOf] = useState(today);
  const [whatIf, setWhatIf] = useState<WhatIf>(NO_WHAT_IF);

  const snap = useMemo(() => snapshot(workbook, asOf, whatIf), [workbook, asOf, whatIf]);
  const timeline = useMemo(() => buildTimeline(workbook, asOf, whatIf), [workbook, asOf, whatIf]);
  const minDate = useMemo(() => timelineBounds(workbook, today).start, [workbook, today]);
  const yearKeys = workbook.years.map((y) => y.key);

  // Only celebrate real, current progress (not scrubbing or what-ifs), on whichever page is open.
  useCelebrate(snap.milestones, asOf === today && whatIf.extraPledges.length === 0, scope);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // The ledger ignores as-of and what-ifs, so the controls would mislead there.
  const viewBar = page !== 'donors' && (
    <ViewBar
      asOf={asOf}
      min={minDate}
      today={today}
      onAsOf={setAsOf}
      whatIf={whatIf}
      onWhatIf={setWhatIf}
    />
  );

  return (
    <main>
      <div className="page">
        <IssuesPanel issues={workbook.issues} />
        {viewBar}

        {page === 'overview' && (
          <Overview workbook={workbook} snap={snap} yearKeys={yearKeys} />
        )}

        {page === 'milestones' && (
          <>
            <PageHead title="Milestones" text="Each deadline, how close you are, and the weekly pace it takes to get there." />
            <MilestoneCards milestones={snap.milestones} yearKeys={yearKeys} />
          </>
        )}

        {page === 'over-time' && (
          <>
            <PageHead title="Over time" text="Cumulative pledged and received, with where the current pace leads." />
            <TimelineChart timeline={timeline} milestones={snap.milestones} asOf={asOf} today={today} yearKeys={yearKeys} />
          </>
        )}

        {page === 'pipeline' && (
          <>
            <PageHead title="Pipeline" text="Who you plan to ask, where each conversation stands, and what's likely to come in." />
            <PipelineBoard asks={workbook.asks} summary={snap.pipeline} asOf={asOf} />
          </>
        )}

        {page === 'donors' && (
          <>
            <PageHead title="Donors" text="Every pledge and gift from the Sheet. Search or sort any column." />
            <LedgerTables workbook={workbook} />
          </>
        )}
      </div>
    </main>
  );
}

function PageHead({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}

function Overview(props: { workbook: Workbook; snap: Snapshot; yearKeys: string[] }) {
  const { workbook, snap, yearKeys } = props;
  const goal = workbook.years.reduce((s, y) => s + y.goal, 0);
  const share = goal > 0 ? snap.totalPledged / goal : 0;
  const next = nextMilestone(snap.milestones);
  const yearsLabel = workbook.years.length === 1 ? 'goal' : `${workbook.years.length}-year goal`;

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Pledged toward your {yearsLabel}</p>
        <h1 className="display">{money(snap.totalPledged)}</h1>
        <p className="lede">
          of <strong>{money(goal)}</strong> · {pct(share)} of the way there.{' '}
          <strong>{money(snap.totalReceived)}</strong> has already come in.
        </p>
        <div className="meter" role="img" aria-label={`${pct(share)} of the total goal pledged`}>
          <div className="meter-fill" style={{ width: `${Math.min(100, share * 100)}%` }} />
        </div>
      </section>

      <section className="grid-2">
        {next ? (
          <div className="section">
            <div className="section-head">
              <h2>Next milestone</h2>
              <a href="#/milestones" className="small">
                All milestones
              </a>
            </div>
            <MilestoneCard m={next} yearKeys={yearKeys} />
          </div>
        ) : (
          <div className="section">
            <div className="section-head">
              <h2>Milestones</h2>
            </div>
            <div className="card">
              <p className="lede">
                {snap.milestones.length ? 'Every upcoming milestone is met. 🎉' : 'No milestones yet. Add them in the Sheet.'}
              </p>
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-head">
            <h2>At a glance</h2>
          </div>
          <dl className="card stat-list">
            <div>
              <dt>Received</dt>
              <dd>{money(snap.totalReceived)}</dd>
            </div>
            <div>
              <dt>Pledged, still to come</dt>
              <dd>{money(Math.max(0, snap.totalPledged - snap.totalReceived))}</dd>
            </div>
            <div>
              <dt>
                Likely from pipeline
                <span className="sub">
                  {snap.pipeline.openCount} open {snap.pipeline.openCount === 1 ? 'ask' : 'asks'} ·{' '}
                  <a href="#/pipeline">view</a>
                </span>
              </dt>
              <dd>{money(snap.pipeline.weighted)}</dd>
            </div>
            <div>
              <dt>Still needed</dt>
              <dd>{money(Math.max(0, goal - snap.totalPledged))}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>By year</h2>
          <span className="small muted">Money fills Y1 first; any surplus rolls into Y2.</span>
        </div>
        <YearProgress years={snap.years} surplus={snap.surplus} yearKeys={yearKeys} />
      </section>
    </>
  );
}

/** The soonest milestone that's still open. */
function nextMilestone(milestones: MilestoneStatus[]): MilestoneStatus | undefined {
  return milestones
    .filter((m) => m.state !== 'met' && m.daysLeft >= 0)
    .sort((a, b) => a.milestone.due.localeCompare(b.milestone.due))[0];
}
