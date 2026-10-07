import type { YearStatus } from '../domain/metrics';
import { fmtDate, money, pct } from './format';

/** Stacked bar per year: received → pledged → likely (pipeline), with 75% and goal markers. */
export function YearProgress({ years, surplus }: { years: YearStatus[]; surplus: number }) {
  return (
    <div className="years">
      {years.map((y, i) => {
        const scale = Math.max(y.goal, y.likely) * 1.05;
        const w = (n: number) => `${(Math.max(0, n) / scale) * 100}%`;
        const received = Math.min(y.received, y.pledged);
        const isLast = i === years.length - 1;
        return (
          <div key={y.key} className="year">
            <div className="year-head">
              <strong>{y.key}</strong>
              <span>
                {money(y.pledged)} pledged of {money(y.goal)} ({pct(y.pledged / y.goal)})
              </span>
              <span className="muted">money from {fmtDate(y.fundsStart)}</span>
            </div>
            <div className="stack">
              <div className="seg seg-received" style={{ width: w(received) }} title={`Received ${money(received)}`} />
              <div
                className="seg seg-pledged"
                style={{ width: w(y.pledged - received) }}
                title={`Pledged, not yet received ${money(y.pledged - received)}`}
              />
              <div
                className="seg seg-likely"
                style={{ width: w(y.likely - y.pledged) }}
                title={`Likely from pipeline ${money(y.likely - y.pledged)}`}
              />
              <div className="marker" style={{ left: w(y.goal * 0.75) }} title="75%" />
              <div className="marker marker-goal" style={{ left: w(y.goal) }} title="Goal" />
            </div>
            <div className="legend-row muted">
              <span>
                <i className="swatch seg-received" /> received {money(y.received)}
              </span>
              <span>
                <i className="swatch seg-pledged" /> pledged {money(y.pledged)}
              </span>
              <span>
                <i className="swatch seg-likely" /> likely {money(y.likely)}
              </span>
              {y.carriedIn > 0 && <span>includes {money(y.carriedIn)} rolled over from previous year</span>}
              {y.overflowOut > 0 && <span>{money(y.overflowOut)} surplus rolls into next year</span>}
              {isLast && surplus > 0 && <span>{money(surplus)} beyond the final goal</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
