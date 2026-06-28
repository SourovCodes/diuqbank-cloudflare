import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

type Option = { value: string; label: string }

export function CreatableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select or type...',
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

  const trimmedQuery = query.trim()
  const filtered = trimmedQuery
    ? options.filter(o => o.label.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : options
  const selected = options.find(o => o.value.toLowerCase() === value.toLowerCase())
  const hasExactMatch = options.some(o => o.value.toLowerCase() === trimmedQuery.toLowerCase())
  const showCreate = trimmedQuery !== '' && !hasExactMatch
  const isCustom = value !== '' && !selected

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

  function select(next: string) {
    onChange(next)
    setOpen(false)
  }

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
        <span className={clsx('truncate', !value && 'text-gray-400')}>
          {selected ? selected.label : value || placeholder}
        </span>
        <span className="ml-2 flex shrink-0 items-center gap-1.5">
          {isCustom && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
              new
            </span>
          )}
          <svg
            className={clsx('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && showCreate) {
                  e.preventDefault()
                  select(trimmedQuery)
                }
              }}
              placeholder="Search or type a new value..."
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {showCreate && (
              <li>
                <button
                  type="button"
                  onClick={() => select(trimmedQuery)}
                  className="w-full px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
                >
                  Use “{trimmedQuery}”
                </button>
              </li>
            )}
            {value && (
              <li>
                <button
                  type="button"
                  onClick={() => select('')}
                  className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-50"
                >
                  Clear selection
                </button>
              </li>
            )}
            {filtered.length === 0 && !showCreate ? (
              <li className="px-3 py-2 text-sm text-gray-400">No results</li>
            ) : (
              filtered.map(o => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => select(o.value)}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-sm',
                      o.value.toLowerCase() === value.toLowerCase()
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
