import { useState } from 'react';
import type { PipelineSummary } from '../domain/metrics';
import type { Ask, ISODate } from '../domain/types';
import { fmtDate, money, pct } from './format';
import { SortableTable, type Column } from './SortableTable';

function isOverdue(a: Ask, asOf: ISODate, openStages: Set<string>) {
  return !!a.nextStepDate && a.nextStepDate < asOf && openStages.has(a.stage);
}

export function PipelineBoard(props: { asks: Ask[]; summary: PipelineSummary; asOf: ISODate }) {
  const { asks, summary, asOf } = props;
  const [view, setView] = useState<'board' | 'list'>('board');
  const open = new Set(summary.byStage.filter((s) => s.open).map((s) => s.stage));
  const overdue = asks.filter((a) => isOverdue(a, asOf, open));

  const columns: Column<Ask>[] = [
    { key: 'name', label: 'Name', value: (a) => a.name },
    { key: 'stage', label: 'Stage', value: (a) => a.stage },
    { key: 'amount', label: 'Ask', value: (a) => a.askAmount, render: (a) => money(a.askAmount), numeric: true },
    { key: 'next', label: 'Next step', value: (a) => a.nextStep },
    { key: 'nextDate', label: 'When', value: (a) => a.nextStepDate ?? '9999', render: (a) => fmtDate(a.nextStepDate) },
    { key: 'last', label: 'Last contact', value: (a) => a.lastContact ?? '', render: (a) => fmtDate(a.lastContact) },
    { key: 'notes', label: 'Notes', value: (a) => a.notes, wrap: true },
  ];

  return (
    <div className="section">
      <div className="stat-row">
        <div>
          <span className="label">Open asks</span>
          <strong>{summary.openCount}</strong>
        </div>
        <div>
          <span className="label">Total asked</span>
          <strong>{money(summary.openTotal)}</strong>
        </div>
        <div>
          <span className="label">Likely, weighted by stage</span>
          <strong>{money(summary.weighted)}</strong>
        </div>
        <div className={overdue.length ? 'warn' : undefined}>
          <span className="label">Overdue next steps</span>
          <strong>{overdue.length}</strong>
        </div>
      </div>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}>
            Board
          </button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            List
          </button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="board">
          {summary.byStage.map((s) => {
            const inStage = asks
              .filter((a) => a.stage === s.stage)
              .sort((a, b) => (a.nextStepDate ?? '9999').localeCompare(b.nextStepDate ?? '9999'));
            return (
              <section key={s.stage} className={`column ${s.open ? '' : 'closed'}`}>
                <header>
                  <strong>{s.stage}</strong>
                  <span className="small muted">
                    {s.count} · {money(s.total)}
                    {s.open && ` · ${pct(s.probability)} odds`}
                  </span>
                </header>
                {inStage.length === 0 && <p className="column-empty">Nobody here yet</p>}
                {inStage.map((a) => {
                  const late = isOverdue(a, asOf, open);
                  return (
                    <div key={a.row} className={`ask ${late ? 'overdue' : ''}`}>
                      <div className="ask-head">
                        <strong>{a.name}</strong>
                        <span>{money(a.askAmount)}</span>
                      </div>
                      {a.nextStep && (
                        <div className="ask-step">
                          {a.nextStep}
                          {a.nextStepDate && (
                            <span className={late ? 'overdue-label' : 'muted'}>
                              {' · '}
                              {late ? 'overdue since ' : ''}
                              {fmtDate(a.nextStepDate)}
                            </span>
                          )}
                        </div>
                      )}
                      {a.notes && <div className="small muted">{a.notes}</div>}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      ) : (
        <SortableTable
          rows={asks}
          columns={columns}
          initialSort={{ key: 'nextDate' }}
          rowClass={(a) => (isOverdue(a, asOf, open) ? 'overdue' : undefined)}
          empty="No one in the pipeline yet. Add people to the Pipeline tab."
        />
      )}
    </div>
  );
}
