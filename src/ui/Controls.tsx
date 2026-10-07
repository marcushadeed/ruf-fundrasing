import { useState } from 'react';
import { fromDayNumber, parseDate, toDayNumber } from '../domain/dates';
import { NO_WHAT_IF, type WhatIf } from '../domain/metrics';
import type { ISODate } from '../domain/types';
import { fmtDate, money, pct } from './format';
import { ChevronIcon } from './icons';

type Open = 'time' | 'what-if' | null;

/**
 * The two "lenses" on the numbers: which date you're looking at, and any what-if changes.
 * Each shows its current state at a glance, opens a panel to adjust it, and resets in one click.
 */
export function ViewBar(props: {
  asOf: ISODate;
  min: ISODate;
  today: ISODate;
  onAsOf: (date: ISODate) => void;
  whatIf: WhatIf;
  onWhatIf: (w: WhatIf) => void;
}) {
  const { asOf, today, whatIf } = props;
  const [open, setOpen] = useState<Open>(null);
  const past = asOf !== today;
  const changes = whatIf.extraPledges.length + (whatIf.conversionOverride !== null ? 1 : 0);
  const toggle = (o: Open) => setOpen((cur) => (cur === o ? null : o));

  return (
    <div className="viewbar">
      <div className="viewbar-row">
        <span className="lens-group">
          <button
            type="button"
            className="lens"
            aria-expanded={open === 'time'}
            data-active={past}
            onClick={() => toggle('time')}
          >
            Showing <strong>{past ? fmtDate(asOf) : 'today'}</strong>
            <ChevronIcon />
          </button>
          {past && (
            <button type="button" className="lens-clear" onClick={() => props.onAsOf(today)}>
              Back to today
            </button>
          )}
        </span>

        <span className="lens-group">
          <button
            type="button"
            className="lens"
            aria-expanded={open === 'what-if'}
            data-active={changes > 0}
            onClick={() => toggle('what-if')}
          >
            What if <strong>{changes ? `${changes} change${changes === 1 ? '' : 's'}` : 'off'}</strong>
            <ChevronIcon />
          </button>
          {changes > 0 && (
            <button type="button" className="lens-clear" onClick={() => props.onWhatIf(NO_WHAT_IF)}>
              Clear
            </button>
          )}
        </span>

        {(past || changes > 0) && (
          <span className="viewbar-note">
            {past && changes > 0
              ? 'Past date and hypotheticals applied.'
              : past
                ? 'You’re looking at a past date.'
                : 'Numbers include hypotheticals.'}
          </span>
        )}
      </div>

      {open === 'time' && <AsOfPanel {...props} />}
      {open === 'what-if' && <WhatIfPanel whatIf={whatIf} onChange={props.onWhatIf} today={today} />}
    </div>
  );
}

/** Time-travel: view the dashboard as it looked on any past date. */
function AsOfPanel(props: { asOf: ISODate; min: ISODate; today: ISODate; onAsOf: (date: ISODate) => void }) {
  const { asOf, min, today, onAsOf } = props;
  return (
    <div className="panel">
      <div>
        <h3>See any past date</h3>
        <p className="panel-hint">Drag to replay how pledges and gifts built up. Nothing in your Sheet changes.</p>
      </div>
      <div className="panel-row">
        <span className="small muted">{fmtDate(min)}</span>
        <input
          type="range"
          aria-label="Date"
          min={toDayNumber(min)}
          max={toDayNumber(today)}
          value={toDayNumber(asOf)}
          onChange={(e) => onAsOf(fromDayNumber(Number(e.target.value)))}
        />
        <span className="small muted">Today</span>
      </div>
      <div className="panel-row">
        <label htmlFor="as-of-date">Or pick a date</label>
        <input
          id="as-of-date"
          type="date"
          value={asOf}
          min={min}
          max={today}
          onChange={(e) => {
            const d = parseDate(e.target.value);
            if (d) onAsOf(d > today ? today : d);
          }}
        />
      </div>
    </div>
  );
}

function WhatIfPanel(props: { whatIf: WhatIf; onChange: (w: WhatIf) => void; today: ISODate }) {
  const { whatIf, onChange, today } = props;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const overriding = whatIf.conversionOverride !== null;

  const add = () => {
    const n = Number(amount.replace(/[$,]/g, ''));
    if (!(n > 0) || !parseDate(date)) return;
    onChange({ ...whatIf, extraPledges: [...whatIf.extraPledges, { amount: n, date }] });
    setAmount('');
  };

  return (
    <div className="panel">
      <div>
        <h3>Try a scenario</h3>
        <p className="panel-hint">Only this view changes. Your Sheet is never touched.</p>
      </div>

      <div className="panel-row">
        <label className="panel-row">
          <input
            type="checkbox"
            checked={overriding}
            onChange={(e) => onChange({ ...whatIf, conversionOverride: e.target.checked ? 0.5 : null })}
          />
          Every open ask comes through at
        </label>
        <input
          type="range"
          aria-label="Conversion rate"
          min={0}
          max={100}
          step={5}
          disabled={!overriding}
          value={Math.round((whatIf.conversionOverride ?? 0.5) * 100)}
          onChange={(e) => onChange({ ...whatIf, conversionOverride: Number(e.target.value) / 100 })}
        />
        <strong className="num" style={{ minWidth: '7ch', fontWeight: 500 }}>
          {overriding ? pct(whatIf.conversionOverride!) : 'stage odds'}
        </strong>
      </div>

      <form
        className="panel-row"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        Add a pledge of
        <input
          inputMode="decimal"
          aria-label="Amount"
          placeholder="$5,000"
          size={8}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        paid on
        <input type="date" aria-label="Paid on" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="submit" className="btn btn-sm">
          Add
        </button>
      </form>

      {whatIf.extraPledges.length > 0 && (
        <ul className="chips">
          {whatIf.extraPledges.map((p, i) => (
            <li key={i} className="chip">
              +{money(p.amount)} on {fmtDate(p.date)}
              <button
                type="button"
                aria-label={`Remove ${money(p.amount)} on ${fmtDate(p.date)}`}
                onClick={() =>
                  onChange({ ...whatIf, extraPledges: whatIf.extraPledges.filter((_, j) => j !== i) })
                }
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
