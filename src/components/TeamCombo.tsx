import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '@/components/Flag'
import { GROUPS, TEAMS } from '@/data/teams'
import { normalizeForSearch } from '@/lib/normalize'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  className?: string
}

export function TeamCombo({ value, onChange, placeholder = 'Team…', className }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = TEAMS.find((t) => t.code === value)

  const grouped = useMemo(() => {
    const q = normalizeForSearch(query)
    return GROUPS.map((g) => ({
      group: g,
      teams: TEAMS.filter(
        (t) =>
          t.group === g &&
          (q.length === 0 ||
            normalizeForSearch(t.name).includes(q) ||
            normalizeForSearch(t.code).includes(q)),
      ),
    })).filter((g) => g.teams.length > 0)
  }, [query])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const select = (code: string) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  const firstMatch = grouped[0]?.teams[0]

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {selected ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Flag code={selected.code} className="h-4 w-6" />
            <span className="truncate">{selected.name}</span>
            <span className="shrink-0 text-xs text-neutral-400">{selected.code}</span>
          </span>
        ) : (
          <span className="text-neutral-500">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-neutral-500 transition',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 flex max-h-80 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-200 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && firstMatch) {
                  e.preventDefault()
                  select(firstMatch.code)
                }
              }}
              placeholder="Search team…"
              autoComplete="off"
              inputMode="search"
              className="w-full rounded border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="overflow-y-auto">
            {grouped.length === 0 ? (
              <div className="p-3 text-center text-sm text-neutral-500">No teams match</div>
            ) : (
              grouped.map(({ group, teams }) => (
                <div key={group}>
                  <div className="bg-neutral-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Group {group}
                  </div>
                  {teams.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => select(t.code)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-neutral-100',
                        t.code === value && 'bg-neutral-50 font-medium',
                      )}
                    >
                      <Flag code={t.code} className="h-4 w-6" />
                      <span className="flex-1 truncate">{t.name}</span>
                      <span className="shrink-0 text-xs text-neutral-400">{t.code}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
