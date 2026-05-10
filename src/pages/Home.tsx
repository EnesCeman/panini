import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GroupSection } from '@/components/GroupSection'
import { ProgressBar } from '@/components/ProgressBar'
import { SearchBar } from '@/components/SearchBar'
import { useStickersMap, useTotals, type Sticker } from '@/lib/state'
import { useTrades, type Trade } from '@/lib/trades'
import { cn } from '@/lib/utils'

export function Home() {
  const { have, missing, doubles, total } = useTotals()
  const stickers = useStickersMap()
  const trades = useTrades()
  const projected = useProjectedTotals(stickers, trades, total)
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
        <StatTile
          label="Have"
          value={have}
          projected={projected.have}
          accent="text-emerald-600"
          upIsGood
        />
        <StatTile
          label="Missing"
          value={missing}
          projected={projected.missing}
          accent="text-neutral-700"
          to="/missing"
          downIsGood
        />
        <StatTile
          label="Doubles"
          value={doubles}
          projected={projected.doubles}
          accent="text-amber-600"
          to="/doubles"
        />
      </section>

      <SearchBar value={query} onChange={setQuery} placeholder="Search by team name or code" />

      <GroupSection query={query} />
    </div>
  )
}

// Project have/missing/doubles assuming every locked-pending trade completes.
function useProjectedTotals(
  stickers: Map<string, Sticker>,
  trades: Map<string, Trade>,
  total: number,
) {
  return useMemo(() => {
    const delta = new Map<string, number>()
    for (const t of trades.values()) {
      if (!t.locked || t.status !== 'pending') continue
      for (const c of t.get) delta.set(c, (delta.get(c) ?? 0) + 1)
      for (const c of t.give) delta.set(c, (delta.get(c) ?? 0) - 1)
    }

    let have = 0
    let doubles = 0
    const seen = new Set<string>()
    for (const [code, s] of stickers) {
      seen.add(code)
      const next = Math.max(0, s.count + (delta.get(code) ?? 0))
      if (next >= 1) have += 1
      if (next >= 2) doubles += next - 1
    }
    for (const [code, d] of delta) {
      if (seen.has(code)) continue
      const next = Math.max(0, d)
      if (next >= 1) have += 1
      if (next >= 2) doubles += next - 1
    }
    have = Math.min(have, total)
    return { have, doubles, missing: Math.max(0, total - have) }
  }, [stickers, trades, total])
}

function StatTile({
  label,
  value,
  projected,
  accent,
  upIsGood,
  downIsGood,
  to,
}: {
  label: string
  value: number
  projected: number
  accent: string
  upIsGood?: boolean
  downIsGood?: boolean
  to?: string
}) {
  const showProjection = projected !== value
  const delta = projected - value
  const isGood = (upIsGood && delta > 0) || (downIsGood && delta < 0)
  const isBad = (upIsGood && delta < 0) || (downIsGood && delta > 0)
  const projectionTone = isGood
    ? 'text-emerald-700'
    : isBad
      ? 'text-rose-700'
      : 'text-neutral-600'

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
      {showProjection && (
        <div className="mt-1.5 flex items-center justify-center gap-0.5 border-t border-neutral-100 pt-1 text-[10px] tabular-nums">
          {delta > 0 ? (
            <ArrowUpRight className={cn('h-2.5 w-2.5', projectionTone)} strokeWidth={2.5} />
          ) : (
            <ArrowDownRight className={cn('h-2.5 w-2.5', projectionTone)} strokeWidth={2.5} />
          )}
          <span className={cn('font-semibold', projectionTone)}>{projected}</span>
          <span className="text-neutral-400">pending</span>
        </div>
      )}
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
