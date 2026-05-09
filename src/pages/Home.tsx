import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GroupSection } from '@/components/GroupSection'
import { ProgressBar } from '@/components/ProgressBar'
import { SearchBar } from '@/components/SearchBar'
import { useTotals } from '@/lib/state'
import { cn } from '@/lib/utils'

export function Home() {
  const { have, missing, doubles, total } = useTotals()
  const pct = total > 0 ? Math.round((have / total) * 100) : 0
  const [query, setQuery] = useState('')

  return (
    <div className="flex flex-col gap-5 px-4 pb-24 pt-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Panini WC 2026</h1>
        <p className="text-sm text-neutral-500">Shared album</p>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-neutral-600">Overall progress</span>
          <span className="text-sm font-semibold tabular-nums text-neutral-900">
            {have} / {total} ({pct}%)
          </span>
        </div>
        <ProgressBar value={have} max={total} className="mt-2 h-3" />
      </section>

      <section className="grid grid-cols-3 gap-2">
        <StatTile label="Have" value={have} accent="text-emerald-600" />
        <StatTile label="Missing" value={missing} accent="text-neutral-700" to="/missing" />
        <StatTile label="Doubles" value={doubles} accent="text-amber-600" to="/doubles" />
      </section>

      <SearchBar value={query} onChange={setQuery} placeholder="Search by team name or code" />

      <GroupSection query={query} />
    </div>
  )
}

function StatTile({
  label,
  value,
  accent,
  to,
}: {
  label: string
  value: number
  accent: string
  to?: string
}) {
  const inner = (
    <>
      {to && (
        <ChevronRight
          className="absolute right-1.5 top-1.5 h-4 w-4 text-neutral-500 transition group-hover:text-neutral-800"
          strokeWidth={2.5}
        />
      )}
      <div className={cn('text-2xl font-bold tabular-nums', accent)}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
    </>
  )
  const className = cn(
    'group relative block rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm',
    to && 'transition active:scale-[0.98] active:bg-neutral-50',
  )
  if (to) {
    return (
      <Link to={to} className={className} aria-label={`${label} (${value}) — open ${label} tab`}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}
