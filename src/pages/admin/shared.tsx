import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { parsePositiveIntParam } from "../../lib/searchParams";
import { inputClass } from "../../components/ui/form";

/** Page-level heading used across every admin screen. */
export function AdminHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Reads/writes the `page` query param, resetting to 1 whenever filters change. */
export function usePageParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveIntParam(searchParams, "page");

  const setPage = (next: number) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(next));
      return params;
    });

  return { page, setPage, searchParams, setSearchParams };
}

/** Debounce a rapidly-changing value (e.g. a search box). */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Small labelled search input for list filter rows. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputClass} sm:max-w-xs`}
    />
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </p>
  );
}
