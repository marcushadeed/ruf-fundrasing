import { useMemo, useState } from 'react';
import { todayISO } from '../domain/dates';
import { NO_WHAT_IF, snapshot, type WhatIf } from '../domain/metrics';
import { buildTimeline, timelineBounds } from '../domain/timeline';
import type { Workbook } from '../domain/types';
import { AsOfScrubber, WhatIfPanel } from './Controls';
import { money } from './format';
import { IssuesPanel } from './IssuesPanel';
import { LedgerTables } from './LedgerTables';
import { MilestoneCards } from './MilestoneCards';
import { PipelineBoard } from './PipelineBoard';
import { TimelineChart } from './TimelineChart';
import { YearProgress } from './YearProgress';

export function Dashboard({ workbook, scope }: { workbook: Workbook; scope: string }) {
  const today = todayISO();
  const [asOf, setAsOf] = useState(today);
  const [whatIf, setWhatIf] = useState<WhatIf>(NO_WHAT_IF);

  const snap = useMemo(() => snapshot(workbook, asOf, whatIf), [workbook, asOf, whatIf]);
  const timeline = useMemo(() => buildTimeline(workbook, asOf, whatIf), [workbook, asOf, whatIf]);
  const minDate = useMemo(() => timelineBounds(workbook, today).start, [workbook, today]);
  const hypothetical = whatIf.extraPledges.length > 0 || whatIf.conversionOverride !== null;

  return (
    <main>
      <IssuesPanel issues={workbook.issues} />

      <section className="controls">
        <AsOfScrubber asOf={asOf} min={minDate} today={today} onChange={setAsOf} />
        <WhatIfPanel whatIf={whatIf} onChange={setWhatIf} today={today} />
      </section>

      {(asOf !== today || hypothetical) && (
        <p className="banner">
          {asOf !== today && 'Viewing a past date. '}
          {hypothetical && 'What-if scenario active: numbers include hypotheticals.'}
        </p>
      )}

      <section className="totals">
        <div>
          <span className="muted">Total pledged</span>
          <strong>{money(snap.totalPledged)}</strong>
        </div>
        <div>
          <span className="muted">Total received</span>
          <strong>{money(snap.totalReceived)}</strong>
        </div>
        <div>
          <span className="muted">Likely from pipeline</span>
          <strong>{money(snap.pipeline.weighted)}</strong>
        </div>
        <div>
          <span className="muted">Goal (all years)</span>
          <strong>{money(workbook.years.reduce((s, y) => s + y.goal, 0))}</strong>
        </div>
      </section>

      <section>
        <h2>Milestones</h2>
        <MilestoneCards
          milestones={snap.milestones}
          celebrate={asOf === today && whatIf.extraPledges.length === 0}
          scope={scope}
        />
      </section>

      <section>
        <h2>Years</h2>
        <YearProgress years={snap.years} surplus={snap.surplus} />
      </section>

      <section>
        <h2>Over time</h2>
        <TimelineChart
          timeline={timeline}
          milestones={snap.milestones}
          asOf={asOf}
          yearKeys={workbook.years.map((y) => y.key)}
        />
      </section>

      <section>
        <h2>Ask pipeline</h2>
        <PipelineBoard asks={workbook.asks} summary={snap.pipeline} asOf={asOf} />
      </section>

      <section>
        <h2>Pledges, gifts & donors</h2>
        <LedgerTables workbook={workbook} />
      </section>
    </main>
  );
}
