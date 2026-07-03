import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

export type Column<T> = {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Extra classes for both the header cell and body cells (e.g. alignment/width). */
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  /** When set, rows become clickable. */
  onRowClick?: (row: T) => void;
  /** Dims the table while a background refetch is in flight. */
  isFetching?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  emptyMessage = "No records found.",
  onRowClick,
  isFetching = false,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-800 dark:bg-gray-900/60">
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
                {columns.map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(
                  "bg-white dark:bg-gray-900",
                  onRowClick &&
                    "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                )}
              >
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
