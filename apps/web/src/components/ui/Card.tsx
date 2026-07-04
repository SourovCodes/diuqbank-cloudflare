import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </h2>
  );
}

// Generic pulsing placeholder for list loading states.
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900",
        className
      )}
    >
      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mt-3.5 h-3 w-full rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}
