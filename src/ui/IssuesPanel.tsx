import type { ParseIssue } from '../domain/types';

/** Rows the dashboard couldn't use, so they can be fixed in the Sheet. Collapsed so it doesn't crowd the page. */
export function IssuesPanel({ issues }: { issues: ParseIssue[] }) {
  if (!issues.length) return null;
  return (
    <details className="issues">
      <summary>
        <span className="dot" aria-hidden />
        {issues.length === 1 ? '1 row in the Sheet couldn’t be read' : `${issues.length} rows in the Sheet couldn’t be read`}
        <span className="action">Details</span>
      </summary>
      <ul>
        {issues.map((i, n) => (
          <li key={n}>
            <strong>{i.tab}</strong>
            {i.row > 0 && ` row ${i.row}`}: {i.message}
          </li>
        ))}
      </ul>
    </details>
  );
}
