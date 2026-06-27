import type { ReactNode } from 'react'

/**
 * Placeholder shown when a list/section has no content. Optionally render an
 * action (e.g. a "Create" link) beneath the message.
 */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center">
      <p className="text-sm text-gray-500">{message}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
