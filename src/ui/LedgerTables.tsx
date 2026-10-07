import { useMemo, useState } from 'react';
import { donorRows, pledgeRows, type DonorRow, type PledgeRow } from '../domain/ledger';
import type { Gift, Workbook } from '../domain/types';
import { fmtDate, money } from './format';
import { matches, SortableTable, type Column } from './SortableTable';

type Tab = 'pledges' | 'gifts' | 'donors';

export function LedgerTables({ workbook }: { workbook: Workbook }) {
  const [tab, setTab] = useState<Tab>('pledges');
  const [query, setQuery] = useState('');
  const pledges = useMemo(() => pledgeRows(workbook), [workbook]);
  const donors = useMemo(() => donorRows(workbook), [workbook]);

  const pledgeCols: Column<PledgeRow>[] = [
    { key: 'id', label: 'ID', value: (r) => r.pledge.id },
    { key: 'donor', label: 'Donor', value: (r) => r.pledge.donor },
    {
      key: 'kind',
      label: 'Kind',
      value: (r) => (r.pledge.kind === 'recurring' ? `${money(r.pledge.amount)} ${r.pledge.frequency}` : 'one-time'),
    },
    { key: 'committed', label: 'Committed', value: (r) => r.pledge.committedOn, render: (r) => fmtDate(r.pledge.committedOn) },
    {
      key: 'when',
      label: 'Paid / expected',
      value: (r) => r.pledge.start,
      render: (r) => (r.pledge.kind === 'recurring' ? `${fmtDate(r.pledge.start)} → ${fmtDate(r.pledge.end) || 'end'}` : fmtDate(r.pledge.start)),
    },
    { key: 'total', label: 'Counts as', value: (r) => r.total, render: (r) => money(r.total), numeric: true },
    ...workbook.years.map(
      (y, i): Column<PledgeRow> => ({
        key: `y${i}`,
        label: `${y.key} period`,
        value: (r) => r.byYear[i],
        render: (r) => (r.byYear[i] ? money(r.byYear[i]) : '—'),
        numeric: true,
      }),
    ),
    { key: 'received', label: 'Received', value: (r) => r.received, render: (r) => money(r.received), numeric: true },
    { key: 'status', label: 'Status', value: (r) => r.pledge.status },
    { key: 'notes', label: 'Notes', value: (r) => r.pledge.notes },
  ];

  const giftCols: Column<Gift>[] = [
    { key: 'date', label: 'Date', value: (g) => g.date, render: (g) => fmtDate(g.date) },
    { key: 'donor', label: 'Donor', value: (g) => g.donor },
    { key: 'amount', label: 'Amount', value: (g) => g.amount, render: (g) => money(g.amount), numeric: true },
    { key: 'pledge', label: 'Pledge', value: (g) => g.pledgeId ?? '(standalone)' },
    { key: 'notes', label: 'Notes', value: (g) => g.notes },
  ];

  const donorCols: Column<DonorRow>[] = [
    { key: 'donor', label: 'Donor', value: (d) => d.donor },
    { key: 'pledged', label: 'Counts as pledged', value: (d) => d.pledged, render: (d) => money(d.pledged), numeric: true },
    { key: 'received', label: 'Received', value: (d) => d.received, render: (d) => money(d.received), numeric: true },
    { key: 'pledges', label: '# pledges', value: (d) => d.pledgeCount, numeric: true },
    { key: 'gifts', label: '# gifts', value: (d) => d.giftCount, numeric: true },
  ];

  return (
    <div>
      <div className="row spread">
        <div className="toggle">
          {(['pledges', 'gifts', 'donors'] as Tab[]).map((t) => (
            <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <input type="search" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {tab === 'pledges' && (
        <>
          <SortableTable
            rows={pledges.filter((r) => matches(r, pledgeCols, query))}
            columns={pledgeCols}
            initialSort={{ key: 'committed', desc: true }}
            rowClass={(r) => (r.pledge.status === 'cancelled' ? 'cancelled' : undefined)}
            empty="No pledges yet."
          />
          <p className="muted small">
            "Period" columns show when each dollar arrives. Surplus beyond a year's goal rolls into the next year as a
            pool, so it isn't attributed to individual donors.
          </p>
        </>
      )}
      {tab === 'gifts' && (
        <SortableTable
          rows={workbook.gifts.filter((g) => matches(g, giftCols, query))}
          columns={giftCols}
          initialSort={{ key: 'date', desc: true }}
          empty="No gifts received yet."
        />
      )}
      {tab === 'donors' && (
        <SortableTable
          rows={donors.filter((d) => matches(d, donorCols, query))}
          columns={donorCols}
          initialSort={{ key: 'pledged', desc: true }}
        />
      )}
    </div>
  );
}
