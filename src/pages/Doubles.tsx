import { useMemo, useState } from 'react'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { QuickAdd } from '@/components/QuickAdd'
import { SearchBar } from '@/components/SearchBar'
import { StickerSheet } from '@/components/StickerSheet'
import { GROUPS, TEAMS, stickerKind } from '@/data/teams'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'
import { groupColor } from '@/lib/groupColors'

type DoubleItem = {
  code: string
  teamCode: string
  num: number
  name: string | null
  count: number
}

export function Doubles() {
  const stickers = useStickersMap()
  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<Set<string>>(new Set())
  const [openCode, setOpenCode] = useState<string | null>(null)

  const allDoubles = useMemo<DoubleItem[]>(() => {
    const out: DoubleItem[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        if (sticker && sticker.count >= 2) {
          out.push({
            code,
            teamCode: team.code,
            num: i,
            name: sticker.name,
            count: sticker.count,
          })
        }
      }
    }
    return out
  }, [stickers])

  const totalExtras = useMemo(
    () => allDoubles.reduce((acc, d) => acc + (d.count - 1), 0),
    [allDoubles],
  )

  const grouped = useMemo(() => {
    const q = normalizeForSearch(query)
    const map = new Map<string, DoubleItem[]>()
    for (const item of allDoubles) {
      const team = TEAMS.find((t) => t.code === item.teamCode)
      if (!team) continue
      if (groupFilter.size > 0 && !groupFilter.has(team.group)) continue
      if (q.length > 0) {
        const album = albumPlayerName(item.code)
        const matches =
          normalizeForSearch(item.code).includes(q) ||
          (!!item.name && normalizeForSearch(item.name).includes(q)) ||
          (!!album && normalizeForSearch(album).includes(q)) ||
          normalizeForSearch(team.name).includes(q)
        if (!matches) continue
      }
      const list = map.get(item.teamCode) ?? []
      list.push(item)
      map.set(item.teamCode, list)
    }
    return TEAMS.map((t) => ({ team: t, items: map.get(t.code) ?? [] }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.team.name.localeCompare(b.team.name))
  }, [allDoubles, query, groupFilter])

  const toggleGroup = (g: string) => {
    setGroupFilter((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h1 className="text-lg font-semibold text-neutral-900">{totalExtras} extras to give</h1>
        <QuickAdd />
        <SearchBar value={query} onChange={setQuery} placeholder="Search by code, name, or team" />
        <div className="flex flex-wrap gap-1.5">
          {GROUPS.map((g) => {
            const active = groupFilter.has(g)
            const c = groupColor(g)
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGroup(g)}
                className={cn(
                  'h-7 min-w-7 rounded-full px-2 text-xs font-bold transition',
                  active ? `${c.bg} text-white` : 'bg-neutral-200 text-neutral-700',
                )}
              >
                {g}
              </button>
            )
          })}
        </div>
      </header>

      {allDoubles.length === 0 ? (
        <EmptyState message="No doubles yet" />
      ) : grouped.length === 0 ? (
        <EmptyState message="No matches" />
      ) : (
        <div className="flex flex-col gap-5 px-4 pt-4">
          {grouped.map(({ team, items }) => (
            <section key={team.code}>
              <div className="mb-2 flex items-center gap-2">
                <Flag code={team.code} className="h-4 w-6" />
                <span className="text-sm font-semibold text-neutral-900">{team.name}</span>
                <GroupPill group={team.group} />
              </div>
              <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {items.map((s, idx) => (
                  <li
                    key={s.code}
                    className={cn(
                      'border-b border-neutral-100',
                      idx === items.length - 1 && 'border-b-0',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenCode(s.code)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-neutral-50"
                    >
                      <Flag code={team.code} className="h-4 w-6" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-neutral-900">
                          {labelFor(s.code, s.num, s.name)}
                        </div>
                        <div className="text-[11px] tabular-nums text-neutral-500">
                          {s.code} · spare: {s.count - 1}
                        </div>
                      </div>
                      <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                        x{s.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <StickerSheet code={openCode} onClose={() => setOpenCode(null)} />
    </div>
  )
}

function labelFor(code: string, num: number, name: string | null): string {
  const kind = stickerKind(num)
  if (kind === 'badge') return 'Team badge'
  if (kind === 'team_photo') return 'Team photo'
  return resolvePlayerLabel(code, name)
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-12 text-center text-sm text-neutral-500">
      {message}
    </div>
  )
}
