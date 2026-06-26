import { clsx } from 'clsx'

type Variant = 'blue' | 'gray' | 'green' | 'yellow' | 'red'

const styles: Record<Variant, string> = {
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
}

export function Badge({ label, variant = 'gray' }: { label: string; variant?: Variant }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', styles[variant])}>
      {label}
    </span>
  )
}
