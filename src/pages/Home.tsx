import { GroupSection } from '@/components/GroupSection'
import { ProgressBar } from '@/components/ProgressBar'
import { useTotals } from '@/lib/state'

export function Home() {
  const { have, missing, doubles, total } = useTotals()
  const pct = total > 0 ? Math.round((have / total) * 100) : 0

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
        <StatTile label="Missing" value={missing} accent="text-neutral-700" />
        <StatTile label="Doubles" value={doubles} accent="text-amber-600" />
      </section>

      <GroupSection />
    </div>
  )
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm">
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  )
}
