import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

export type Column<T> = {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Extra classes for both the header cell and body cells (e.g. alignment/width). */
  className?: string;
};

const checkboxClass = "h-4 w-4 cursor-pointer accent-blue-600";

type DataTableProps<T, K extends string | number> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => K;
  isLoading?: boolean;
  emptyMessage?: string;
  /** When set, rows become clickable. */
  onRowClick?: (row: T) => void;
  /** Dims the table while a background refetch is in flight. */
  isFetching?: boolean;
  /** When set, a checkbox column is rendered and rows become selectable. */
  selection?: {
    selected: Set<K>;
    onChange: (next: Set<K>) => void;
  };
};

export function DataTable<T, K extends string | number>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  emptyMessage = "No records found.",
  onRowClick,
  isFetching = false,
  selection,
}: DataTableProps<T, K>) {
  const pageKeys = rows.map(rowKey);
  const selectedOnPage = selection
    ? pageKeys.filter((k) => selection.selected.has(k))
    : [];
  const allSelected =
    selection !== undefined &&
    pageKeys.length > 0 &&
    selectedOnPage.length === pageKeys.length;

  function toggleAll() {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (allSelected) for (const k of pageKeys) next.delete(k);
    else for (const k of pageKeys) next.add(k);
    selection.onChange(next);
  }

  function toggleRow(key: K) {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  }

  const colSpan = columns.length + (selection ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-800 dark:bg-gray-900/60">
            {selection && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  aria-label="Select all rows on this page"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        selectedOnPage.length > 0 && !allSelected;
                    }
                  }}
                  onChange={toggleAll}
                  disabled={isLoading || rows.length === 0}
                />
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={i}
                className={cx(
                  "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={cx(
            "divide-y divide-gray-100 transition-opacity dark:divide-gray-800",
            isFetching && "opacity-60"
          )}
        >
          {isLoading ? (
            Array.from({ length: 6 }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: colSpan }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    "bg-white dark:bg-gray-900",
                    onRowClick &&
                      "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60",
                    selection?.selected.has(key) &&
                      "bg-blue-50/60 dark:bg-blue-500/5"
                  )}
                >
                  {selection && (
                    // Clicks on the checkbox cell must not trigger onRowClick.
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        aria-label="Select row"
                        checked={selection.selected.has(key)}
                        onChange={() => toggleRow(key)}
                      />
                    </td>
                  )}
                  {columns.map((col, c) => (
                    <td
                      key={c}
                      className={cx(
                        "px-4 py-3 align-middle text-gray-700 dark:text-gray-200",
                        col.className
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
