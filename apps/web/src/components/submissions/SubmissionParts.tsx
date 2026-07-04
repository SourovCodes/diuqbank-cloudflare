import { useEffect, useRef, useState } from "react";
import { cx } from "../../lib/cx";

const toolbarBtn =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100";

export function PdfPreview({
  url,
  title = "PDF",
}: {
  url: string | null;
  title?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const onChange = () =>
      setIsFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!url) {
    return (
      <div className="pdf-frame flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No PDF available.
        </p>
      </div>
    );
  }

  // ponytail: native Fullscreen API; iOS Safari doesn't grant it to <div>, button no-ops there.
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  };

  return (
    <div
      ref={wrapRef}
      className={cx(
        "flex flex-col overflow-hidden border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
        isFull ? "rounded-none" : "rounded-lg"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900/60">
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </span>
        <div className="flex items-center gap-1">
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className={toolbarBtn}
            title="Open in new tab"
          >
            <NewTabIcon />
            <span className="hidden sm:inline">Open in new tab</span>
          </a>
          <button
            type="button"
            onClick={toggleFull}
            className={toolbarBtn}
            title={isFull ? "Exit fullscreen" : "Fullscreen"}
            aria-label={isFull ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFull ? <MinimizeIcon /> : <ExpandIcon />}
            <span className="hidden sm:inline">
              {isFull ? "Exit fullscreen" : "Fullscreen"}
            </span>
          </button>
        </div>
      </div>
      {/* `flex-1` only in fullscreen: its flex-basis would override the
          pdf-frame height in normal flow. */}
      <iframe
        src={url}
        title={title}
        className={cx(
          "w-full bg-white dark:bg-gray-900",
          isFull ? "flex-1" : "pdf-frame"
        )}
      />
    </div>
  );
}

function NewTabIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4h6m0 0v6m0-6L10 14M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H4v4M4 3l5 5m7-5h4v4m0-4-5 5M8 21H4v-4m0 4 5-5m7 5h4v-4m0 4-5-5" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v6H3m18 0h-6V3M3 15h6v6m6 0v-6h6" />
    </svg>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-800 dark:text-gray-200">
        {value}
      </dd>
    </div>
  );
}
