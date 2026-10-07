import { useState } from 'react';
import { fromDayNumber, parseDate, toDayNumber } from '../domain/dates';
import type { WhatIf } from '../domain/metrics';
import type { ISODate } from '../domain/types';
import { fmtDate, money, pct } from './format';

/** Time-travel: view the dashboard as it looked on any past date. */
export function AsOfScrubber(props: {
  asOf: ISODate;
  min: ISODate;
  today: ISODate;
  onChange: (date: ISODate) => void;
}) {
  const { asOf, min, today, onChange } = props;
  return (
    <div className="control">
      <label>
        <strong>As of {fmtDate(asOf)}</strong>
        {asOf !== today && (
          <button type="button" className="link" onClick={() => onChange(today)}>
            back to today
          </button>
        )}
      </label>
      <input
        type="range"
        min={toDayNumber(min)}
        max={toDayNumber(today)}
        value={toDayNumber(asOf)}
        onChange={(e) => onChange(fromDayNumber(Number(e.target.value)))}
      />
      <input
        type="date"
        value={asOf}
        min={min}
        max={today}
        onChange={(e) => {
          const d = parseDate(e.target.value);
          if (d) onChange(d > today ? today : d);
        }}
      />
    </div>
  );
}

export function WhatIfPanel(props: { whatIf: WhatIf; onChange: (w: WhatIf) => void; today: ISODate }) {
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
    <div className="control">
      <strong>What if…</strong>
      <label className="row">
        <input
          type="checkbox"
          checked={overriding}
          onChange={(e) => onChange({ ...whatIf, conversionOverride: e.target.checked ? 0.5 : null })}
        />
        every open ask converts at
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          disabled={!overriding}
          value={Math.round((whatIf.conversionOverride ?? 0.5) * 100)}
          onChange={(e) => onChange({ ...whatIf, conversionOverride: Number(e.target.value) / 100 })}
        />
        <span>{overriding ? pct(whatIf.conversionOverride!) : 'stage defaults'}</span>
      </label>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        I get an extra pledge of
        <input
          inputMode="decimal"
          placeholder="$5,000"
          size={8}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        paid on
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      {whatIf.extraPledges.length > 0 && (
        <ul className="chips">
          {whatIf.extraPledges.map((p, i) => (
            <li key={i}>
              {money(p.amount)} on {fmtDate(p.date)}{' '}
              <button
                type="button"
                className="link"
                aria-label="Remove"
                onClick={() =>
                  onChange({ ...whatIf, extraPledges: whatIf.extraPledges.filter((_, j) => j !== i) })
                }
              >
                ✕
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="link" onClick={() => onChange({ ...whatIf, extraPledges: [] })}>
              clear all
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
