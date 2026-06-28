import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { Spinner } from '../ui/Spinner'

// Re-exported for admin pages that import these alongside the admin UI primitives.
export { formatDate } from '@diuqbank/shared'
export { EmptyState } from '../ui/EmptyState'

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-gray-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const buttonBase =
  'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-55'

const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-950',
  link: 'h-auto rounded-none px-0 text-blue-600 hover:text-blue-700 hover:underline focus:ring-0 focus:ring-offset-0',
  dangerLink: 'h-auto rounded-none px-0 text-red-600 hover:text-red-700 hover:underline focus:ring-0 focus:ring-offset-0',
} as const

type ButtonVariant = keyof typeof buttonVariants

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button {...props} className={clsx(buttonBase, buttonVariants[variant], className)}>
      {children}
    </button>
  )
}

export function PrimaryLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={clsx(buttonBase, buttonVariants.primary)}
    >
      {children}
    </Link>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-lg border border-gray-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export const inputClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputClass, props.className)} />
}

export function SubmitButton({ saving, children }: { saving: boolean; children: ReactNode }) {
  return (
    <Button type="submit" disabled={saving}>
      {saving ? 'Saving...' : children}
    </Button>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
}

export function TableCard({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </Card>
  )
}

export function DataTable({ children }: { children: ReactNode }) {
  return <table className="w-full min-w-[720px] text-sm">{children}</table>
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
      {children}
    </thead>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={clsx('px-4 py-2.5 font-semibold', className)}>{children}</th>
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-2.5 align-middle', className)}>{children}</td>
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-3 whitespace-nowrap">{children}</div>
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">{children}</div>
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
      <Spinner className="h-5 w-5" />
      {label}
    </div>
  )
}

export function StatusBanner({
  tone = 'info',
  children,
}: { tone?: 'info' | 'success' | 'warning' | 'danger'; children: ReactNode }) {
  const tones = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    danger: 'border-red-200 bg-red-50 text-red-800',
  }

  return (
    <div className={clsx('rounded-md border px-3 py-2 text-sm font-medium', tones[tone])}>
      {children}
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'success' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  const buttonVariant = variant === 'success' ? 'success' : variant === 'primary' ? 'primary' : 'danger'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/45"
        aria-label="Close confirmation"
        onClick={busy ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h2 id="admin-confirm-title" className="text-base font-semibold text-gray-950">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={buttonVariant} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
