import type { YearStatus } from '../domain/metrics';
import { fmtDate, metricColor, money, pct } from './format';

/** One card per year: stacked received → pledged → likely (pipeline), with 75% and goal markers. */
export function YearProgress({ years, surplus, yearKeys }: { years: YearStatus[]; surplus: number; yearKeys: string[] }) {
  return (
    <div className="grid-2">
      {years.map((y, i) => {
        const scale = Math.max(y.goal, y.likely) * 1.05;
        const w = (n: number) => `${(Math.max(0, n) / scale) * 100}%`;
        const received = Math.min(y.received, y.pledged);
        const isLast = i === years.length - 1;
        const notes = [
          y.carriedIn > 0 && `Includes ${money(y.carriedIn)} rolled over from the previous year`,
          y.overflowOut > 0 && `${money(y.overflowOut)} surplus rolls into the next year`,
          isLast && surplus > 0 && `${money(surplus)} beyond the final goal`,
        ].filter(Boolean) as string[];

        return (
          <article
            key={y.key}
            className="card"
            style={{ ['--series' as string]: metricColor(`${y.key.toLowerCase()}_pledged`, yearKeys) }}
          >
            <div className="card-top">
              <h3 className="card-title">{y.key}</h3>
              <span className="small muted">Money from {fmtDate(y.fundsStart)}</span>
            </div>
            <div className="figure">
              <span className="figure-value">{money(y.pledged)}</span>
              <span className="figure-of">
                of {money(y.goal)} pledged · {pct(y.goal ? y.pledged / y.goal : 0)}
              </span>
            </div>

            <div className="stack-wrap">
              <div
                className="stack"
                role="img"
                aria-label={`${y.key}: ${money(received)} received, ${money(y.pledged)} pledged, ${money(y.likely)} likely, goal ${money(y.goal)}`}
              >
                {received > 0 && <div className="seg seg-received" style={{ width: w(received) }} title={`Received ${money(received)}`} />}
                {y.pledged - received > 0 && (
                  <div
                    className="seg seg-pledged"
                    style={{ width: w(y.pledged - received) }}
                    title={`Pledged, not yet received ${money(y.pledged - received)}`}
                  />
                )}
                {y.likely - y.pledged > 0 && (
                  <div
                    className="seg hatch"
                    style={{ width: w(y.likely - y.pledged) }}
                    title={`Likely from pipeline ${money(y.likely - y.pledged)}`}
                  />
                )}
              </div>
              <div className="marker" style={{ left: w(y.goal * 0.75) }}>
                <span className="marker-label">75%</span>
              </div>
              <div className="marker marker-goal" style={{ left: w(y.goal) }}>
                <span className="marker-label">Goal</span>
              </div>
            </div>

            <ul className="legend">
              <li>
                <i className="swatch seg-received" /> Received <strong>{money(y.received)}</strong>
              </li>
              <li>
                <i className="swatch seg-pledged" /> Pledged <strong>{money(y.pledged)}</strong>
              </li>
              <li>
                <i className="swatch hatch" /> Likely <strong>{money(y.likely)}</strong>
              </li>
            </ul>
            {notes.length > 0 && (
              <ul className="notes">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}
