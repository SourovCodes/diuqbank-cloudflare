import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

type Option = { value: string; label: string }

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}: {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    } else {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={clsx(
          'flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm transition',
          disabled
            ? 'cursor-not-allowed border-gray-200 text-gray-400 opacity-60'
            : 'cursor-pointer border-gray-200 text-gray-700 hover:border-blue-400',
          open && !disabled && 'border-blue-500 ring-1 ring-blue-500'
        )}
      >
        <span className={clsx('truncate', !selected && 'text-gray-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={clsx('ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {value && (
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false) }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-50"
                >
                  Clear selection
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No results</li>
            ) : (
              filtered.map(o => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-sm',
                      o.value === value
                        ? 'bg-blue-50 font-medium text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
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
  )
}
