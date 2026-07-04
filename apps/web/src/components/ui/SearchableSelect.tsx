import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { cx } from "../../lib/cx";
import type { SelectOption } from "../../types/api";

type SearchableSelectProps = {
  id: string;
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;
  const listboxId = `${id}-listbox`;
  const valueId = `${id}-value`;
  const activeOptionId =
    open && filtered[activeIndex]
      ? `${id}-option-${filtered[activeIndex].value}`
      : undefined;

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        e.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function selectOption(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((index) =>
        filtered.length ? Math.min(index + 1, filtered.length - 1) : 0
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      selectOption(filtered[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        aria-labelledby={`${id}-label ${valueId}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={cx(
          "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
          disabled
            ? "cursor-not-allowed border-gray-200 text-gray-400 opacity-60 dark:border-gray-800"
            : "cursor-pointer border-gray-300 bg-white text-gray-700 hover:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200",
          open && !disabled && "border-blue-500 ring-1 ring-blue-500"
        )}
      >
        <span
          id={valueId}
          className={cx("truncate", !selected && "text-gray-400 dark:text-gray-500")}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          aria-hidden="true"
          focusable="false"
          className={cx(
            "ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform",
            open && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              Clear selection
            </button>
          )}
          <div className="border-b border-gray-100 p-2 dark:border-gray-800">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              onKeyDown={handleInputKeyDown}
              placeholder="Search..."
              aria-label={`Search ${label}`}
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400" role="presentation">
                No results
              </li>
            ) : (
              filtered.map((o, index) => (
                <li key={o.value}>
                  <button
                    id={`${id}-option-${o.value}`}
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    onClick={() => {
                      selectOption(o);
                    }}
                    className={cx(
                      "w-full px-3 py-2 text-left text-sm",
                      o.value === value
                        ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                        : index === activeIndex
                          ? "bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    )}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
