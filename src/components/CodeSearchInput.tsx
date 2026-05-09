import { Search, X } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (v: string) => void
  className?: string
}

function parse(v: string): [string, string] {
  const idx = v.indexOf('-')
  if (idx === -1) return [v.toUpperCase(), '']
  return [v.slice(0, idx).toUpperCase(), v.slice(idx + 1)]
}

function combine(prefix: string, num: string): string {
  if (!prefix && !num) return ''
  return `${prefix}-${num}`
}

export function CodeSearchInput({ value, onChange, className }: Props) {
  const [prefix, num] = parse(value)
  const prefixRef = useRef<HTMLInputElement>(null)
  const numRef = useRef<HTMLInputElement>(null)

  function setPrefix(raw: string) {
    const cleaned = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
    onChange(combine(cleaned, num))
    if (cleaned.length === 3 && prefix.length < 3) {
      // Just completed the prefix → jump to number
      requestAnimationFrame(() => numRef.current?.focus())
    }
  }

  function setNum(raw: string) {
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 2)
    onChange(combine(prefix, cleaned))
  }

  function onNumKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && num.length === 0) {
      e.preventDefault()
      const el = prefixRef.current
      if (el) {
        el.focus()
        const end = prefix.length
        el.setSelectionRange(end, end)
      }
    }
    if (e.key === 'ArrowLeft' && (e.currentTarget.selectionStart ?? 0) === 0) {
      e.preventDefault()
      const el = prefixRef.current
      if (el) {
        el.focus()
        const end = prefix.length
        el.setSelectionRange(end, end)
      }
    }
  }

  function onPrefixKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (
      e.key === 'ArrowRight' &&
      (e.currentTarget.selectionStart ?? 0) === prefix.length
    ) {
      e.preventDefault()
      numRef.current?.focus()
    }
  }

  function clearAll() {
    onChange('')
    prefixRef.current?.focus()
  }

  const showClear = value.length > 0

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <div className="flex h-9 items-center rounded-md border border-neutral-200 bg-white pl-9 pr-9 text-sm">
        <input
          ref={prefixRef}
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          onKeyDown={onPrefixKeyDown}
          placeholder="POR"
          className="w-12 bg-transparent font-mono uppercase tracking-wider outline-none placeholder:text-neutral-300"
          autoComplete="off"
          aria-label="Team code"
        />
        <span className="select-none px-0.5 font-mono text-neutral-400">-</span>
        <input
          ref={numRef}
          value={num}
          onChange={(e) => setNum(e.target.value)}
          onKeyDown={onNumKeyDown}
          placeholder="5"
          className="w-10 bg-transparent font-mono tabular-nums outline-none placeholder:text-neutral-300"
          autoComplete="off"
          inputMode="numeric"
          aria-label="Sticker number"
        />
      </div>
      {showClear && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clearAll}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:text-neutral-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
