import { clsx } from 'clsx'

/**
 * A shimmering placeholder block. Compose several to mirror the shape of the
 * content being loaded (cards, rows, lines) instead of a bare spinner.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx('animate-pulse rounded-md bg-gray-200', className)}
      aria-hidden="true"
    />
  )
}

/** A vertical stack of `count` skeleton rows — handy for list/table loading. */
export function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={clsx('h-16 w-full', className)} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
