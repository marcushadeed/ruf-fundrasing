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
    { key: 'notes', label: 'Notes', value: (a) => a.notes },
  ];

  return (
    <div>
      <div className="row spread">
        <p>
          {summary.openCount} open asks totalling {money(summary.openTotal)} →{' '}
          <strong>{money(summary.weighted)} likely</strong>
          {overdue.length > 0 && <span className="warn"> · {overdue.length} overdue next step(s)</span>}
        </p>
        <div className="toggle">
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
          {summary.byStage.map((s) => (
            <section key={s.stage} className={`column ${s.open ? '' : 'closed'}`}>
              <header>
                <strong>{s.stage}</strong>
                <span className="muted small">
                  {s.count} · {money(s.total)}
                  {s.open && ` · ${pct(s.probability)} → ${money(s.weighted)}`}
                </span>
              </header>
              {asks
                .filter((a) => a.stage === s.stage)
                .sort((a, b) => (a.nextStepDate ?? '9999').localeCompare(b.nextStepDate ?? '9999'))
                .map((a) => (
                  <div key={a.row} className={`ask ${isOverdue(a, asOf, open) ? 'overdue' : ''}`}>
                    <div className="row spread">
                      <strong>{a.name}</strong>
                      <span>{money(a.askAmount)}</span>
                    </div>
                    {a.nextStep && (
                      <div className="small">
                        {a.nextStep}
                        {a.nextStepDate && ` · ${fmtDate(a.nextStepDate)}`}
                      </div>
                    )}
                    {a.notes && <div className="small muted">{a.notes}</div>}
                  </div>
                ))}
            </section>
          ))}
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
