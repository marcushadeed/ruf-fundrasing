import type { ParseIssue } from '../domain/types';

/** Rows the dashboard couldn't use, so they can be fixed in the Sheet. */
export function IssuesPanel({ issues }: { issues: ParseIssue[] }) {
  if (!issues.length) return null;
  return (
    <details className="issues" open>
      <summary>
        ⚠️ {issues.length === 1 ? '1 row in the Sheet needs' : `${issues.length} rows in the Sheet need`} attention
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
