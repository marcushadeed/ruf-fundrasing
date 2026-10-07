import { useMemo, useState, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  /** Used for sorting and searching. */
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  numeric?: boolean;
  /** Long free text (notes) that should wrap instead of widening the table. */
  wrap?: boolean;
}

export function SortableTable<T>(props: {
  rows: T[];
  columns: Column<T>[];
  initialSort?: { key: string; desc?: boolean };
  rowClass?: (row: T) => string | undefined;
  empty?: string;
}) {
  const { rows, columns } = props;
  const [sort, setSort] = useState(props.initialSort ?? { key: columns[0].key, desc: false });

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const out = [...rows].sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    });
    return sort.desc ? out.reverse() : out;
  }, [rows, columns, sort]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  className={c.numeric ? 'num' : undefined}
                  aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : undefined}
                >
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : !!c.numeric }))}
                  >
                    {c.label}
                    {active && (
                      <span className="sort-icon" aria-hidden>
                        {sort.desc ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="empty">
                {props.empty ?? 'Nothing here yet.'}
              </td>
            </tr>
          )}
          {sorted.map((r, i) => (
            <tr key={i} className={props.rowClass?.(r)}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? 'num' : c.wrap ? 'notes-cell' : undefined}>
                  {c.render ? c.render(r) : c.value(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Case-insensitive match against every column's value. */
export function matches<T>(row: T, columns: Column<T>[], query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return columns.some((c) => String(c.value(row)).toLowerCase().includes(q));
}
