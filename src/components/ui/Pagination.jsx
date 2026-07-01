import { cx } from "../../lib/cx";

function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function Pagination({ meta, onPageChange }) {
  const { page, totalPages } = meta;
  if (totalPages <= 1) return null;

  const nav =
    "rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800";

  return (
    <nav className="flex items-center justify-center gap-1 py-6" aria-label="Pagination">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className={nav}>
        ← Prev
      </button>

      {pageRange(page, totalPages).map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-2 py-1.5 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cx(
              "min-w-[2rem] rounded-md px-2 py-1.5 text-sm font-medium",
              p === page
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className={nav}
      >
        Next →
      </button>
    </nav>
  );
}
