import { useMemo, useState } from 'react'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { SearchBar } from '@/components/SearchBar'
import { StickerSheet } from '@/components/StickerSheet'
import { GROUPS, TEAMS, stickerKind } from '@/data/teams'
import { useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'
import { groupColor } from '@/lib/groupColors'

type MissingItem = { code: string; teamCode: string; num: number; name: string | null }

export function Missing() {
  const stickers = useStickersMap()
  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<Set<string>>(new Set())
  const [openCode, setOpenCode] = useState<string | null>(null)

  const allMissing = useMemo<MissingItem[]>(() => {
    const out: MissingItem[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        if (!sticker || sticker.count === 0) {
          out.push({ code, teamCode: team.code, num: i, name: sticker?.name ?? null })
        }
      }
    }
    return out
  }, [stickers])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, MissingItem[]>()
    for (const item of allMissing) {
      const team = TEAMS.find((t) => t.code === item.teamCode)
      if (!team) continue
      if (groupFilter.size > 0 && !groupFilter.has(team.group)) continue
      if (q.length > 0) {
        const matches =
          item.code.toLowerCase().includes(q) ||
          (item.name?.toLowerCase().includes(q) ?? false) ||
          team.name.toLowerCase().includes(q)
        if (!matches) continue
      }
      const list = map.get(item.teamCode) ?? []
      list.push(item)
      map.set(item.teamCode, list)
    }
    return TEAMS.map((t) => ({ team: t, items: map.get(t.code) ?? [] })).filter(
      (g) => g.items.length > 0,
    )
  }, [allMissing, query, groupFilter])

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
        className="sticky top-0 z-20 flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50/85 px-4 pb-3 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h1 className="text-lg font-semibold text-neutral-900">Missing {allMissing.length}</h1>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search by code, name, or team"
        />
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

      {allMissing.length === 0 ? (
        <EmptyState message="Album complete!" />
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
                <span className="ml-auto text-xs tabular-nums text-neutral-500">
                  {items.length}
                </span>
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
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-200 px-1.5 text-[11px] font-bold text-neutral-700">
                        {s.num}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">
                        {labelFor(s.code, s.num, s.name)}
                      </span>
                      <span className="text-xs tabular-nums text-neutral-400">{s.code}</span>
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
  return name && name.length > 0 ? name : code
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-12 text-center text-sm text-neutral-500">
      {message}
    </div>
  )
}
