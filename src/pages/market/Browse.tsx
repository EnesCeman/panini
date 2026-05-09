import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { SearchBar } from '@/components/SearchBar'
import { ReservationBadge } from '@/components/market/ReservationBadge'
import { Button } from '@/components/ui/button'
import { TEAMS, stickerKind } from '@/data/teams'
import { applyAutoDash } from '@/lib/autoDash'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { availableSpare } from '@/lib/reservations'
import { useReservations, useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

type SearchMode = 'name' | 'code'

const TEAM_CODE_SET = new Set(TEAMS.map((t) => t.code))

type Item = {
  code: string
  teamCode: string
  num: number
  name: string | null
}

function labelFor(code: string, num: number, name: string | null): string {
  const kind = stickerKind(num)
  if (kind === 'badge') return 'Team badge'
  if (kind === 'team_photo') return 'Team photo'
  return resolvePlayerLabel(code, name)
}

export function Browse() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-3">
      <Intro />
      <MissingSection />
      <DoublesSection />
      <Link to="/market/new" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <Button className="rounded-full shadow-lg">Send a swap proposal</Button>
      </Link>
    </div>
  )
}

function Intro() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
      <p className="font-semibold">Looking to swap?</p>
      <p className="mt-1 text-xs text-neutral-500">
        Browse what I'm missing and what I have spare. Build a proposal —
        accept/reject is up to me.
      </p>
    </div>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: SearchMode
  onChange: (m: SearchMode) => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-neutral-200 text-[11px] font-medium">
      {(['name', 'code'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'px-2 py-1',
            mode === m ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600',
          )}
        >
          {m === 'name' ? 'Name' : 'Code'}
        </button>
      ))}
    </div>
  )
}

function matchesQuery(
  query: string,
  mode: SearchMode,
  item: Item,
  team: { name: string },
): boolean {
  if (query.length === 0) return true
  if (mode === 'code') {
    return item.code.toUpperCase().includes(query.toUpperCase())
  }
  const q = normalizeForSearch(query)
  const album = albumPlayerName(item.code)
  return (
    (item.name ? normalizeForSearch(item.name).includes(q) : false) ||
    (album ? normalizeForSearch(album).includes(q) : false) ||
    normalizeForSearch(team.name).includes(q)
  )
}

function MissingSection() {
  const stickers = useStickersMap()
  const { incoming } = useReservations()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')

  const items = useMemo<Item[]>(() => {
    const out: Item[] = []
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
    const map = new Map<string, Item[]>()
    for (const item of items) {
      const team = TEAMS.find((t) => t.code === item.teamCode)
      if (!team) continue
      if (!matchesQuery(query, mode, item, team)) continue
      const list = map.get(item.teamCode) ?? []
      list.push(item)
      map.set(item.teamCode, list)
    }
    return TEAMS.map((t) => ({ team: t, items: map.get(t.code) ?? [] }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.team.name.localeCompare(b.team.name))
  }, [items, query, mode])

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">What I need ({items.length})</h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </header>
      <SearchBar
        value={query}
        onChange={(v) =>
          setQuery(mode === 'code' ? applyAutoDash(v, TEAM_CODE_SET) : v)
        }
        placeholder={mode === 'code' ? 'Code, e.g. POR-5' : 'Player, team…'}
      />
      <div className="mt-3 flex flex-col gap-4">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">No matches</p>
        ) : (
          grouped.map(({ team, items }) => (
            <section key={team.code}>
              <Link
                to={`/team/${team.code}`}
                className="mb-1 -mx-1 flex items-center gap-2 rounded px-1 py-0.5"
              >
                <Flag code={team.code} className="h-4 w-6 shrink-0" />
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {team.name}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
                <GroupPill group={team.group} />
              </Link>
              <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {items.map((s, idx) => (
                  <li
                    key={s.code}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-left',
                      idx !== items.length - 1 && 'border-b border-neutral-100',
                    )}
                  >
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-200 px-1.5 text-[11px] font-bold text-neutral-700">
                      {s.num}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">
                      {labelFor(s.code, s.num, s.name)}
                    </span>
                    {(incoming.get(s.code) ?? 0) > 0 && (
                      <ReservationBadge kind="incoming" reserved={incoming.get(s.code)} />
                    )}
                    <span className="text-xs tabular-nums text-neutral-400">{s.code}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  )
}

function DoublesSection() {
  const stickers = useStickersMap()
  const { outgoing } = useReservations()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')

  type DItem = Item & { count: number; available: number }

  const items = useMemo<DItem[]>(() => {
    const out: DItem[] = []
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
            available: availableSpare(sticker.count, outgoing.get(code) ?? 0),
          })
        }
      }
    }
    return out
  }, [stickers, outgoing])

  const grouped = useMemo(() => {
    const map = new Map<string, DItem[]>()
    for (const item of items) {
      const team = TEAMS.find((t) => t.code === item.teamCode)
      if (!team) continue
      if (!matchesQuery(query, mode, item, team)) continue
      const list = map.get(item.teamCode) ?? []
      list.push(item)
      map.set(item.teamCode, list)
    }
    return TEAMS.map((t) => ({ team: t, items: map.get(t.code) ?? [] }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.team.name.localeCompare(b.team.name))
  }, [items, query, mode])

  const totalSpare = items.reduce((acc, i) => acc + (i.count - 1), 0)

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">
          What I'm giving ({totalSpare} spare)
        </h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </header>
      <SearchBar
        value={query}
        onChange={(v) =>
          setQuery(mode === 'code' ? applyAutoDash(v, TEAM_CODE_SET) : v)
        }
        placeholder={mode === 'code' ? 'Code, e.g. POR-5' : 'Player, team…'}
      />
      <div className="mt-3 flex flex-col gap-4">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">No matches</p>
        ) : (
          grouped.map(({ team, items }) => (
            <section key={team.code}>
              <Link
                to={`/team/${team.code}`}
                className="mb-1 -mx-1 flex items-center gap-2 rounded px-1 py-0.5"
              >
                <Flag code={team.code} className="h-4 w-6 shrink-0" />
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {team.name}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
                <GroupPill group={team.group} />
              </Link>
              <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {items.map((s, idx) => {
                  const reserved = outgoing.get(s.code) ?? 0
                  return (
                    <li
                      key={s.code}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2',
                        idx !== items.length - 1 && 'border-b border-neutral-100',
                      )}
                    >
                      <Flag code={team.code} className="h-4 w-6" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-neutral-900">
                          {labelFor(s.code, s.num, s.name)}
                        </div>
                        <div className="text-[11px] tabular-nums text-neutral-500">
                          {s.code} · {s.available} of {s.count - 1} spare
                        </div>
                      </div>
                      {s.available === 0 ? (
                        <ReservationBadge kind="all-reserved" />
                      ) : reserved > 0 ? (
                        <ReservationBadge kind="partial-reserved" reserved={reserved} />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  )
}
