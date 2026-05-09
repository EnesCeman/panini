import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CodeSearchInput } from '@/components/CodeSearchInput'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { SearchBar } from '@/components/SearchBar'
import { ReservationBadge } from '@/components/market/ReservationBadge'
import { Button } from '@/components/ui/button'
import { TEAMS, stickerKind } from '@/data/teams'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { availableSpare } from '@/lib/reservations'
import { useReservations, useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

type SearchMode = 'name' | 'code'

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
    <div className="flex flex-col gap-6 px-4 pt-3 md:px-6">
      <Intro />
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-6">
        <DoublesSection />
        <MissingSection />
      </div>
      <Link to="/market/new" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <Button className="rounded-full shadow-lg">Build a custom proposal</Button>
      </Link>
    </div>
  )
}

function Intro() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
      <p className="font-semibold">Hey! Looking to swap World Cup stickers?</p>
      <p className="mt-2 text-xs text-neutral-600">
        Below: <strong>cards I'm missing</strong> (left) and{' '}
        <strong>cards I have spare</strong> (right). Tap any to start.
      </p>

      <p className="mt-3 text-xs font-semibold text-neutral-800">How to build a trade</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-neutral-600">
        <li>
          <strong>Start with what you'd offer:</strong> tap a card from{' '}
          <em>Cards I'm missing</em>, then multi-select which of{' '}
          <em>my spares</em> you want in return.
        </li>
        <li>
          <strong>Or start with what you want:</strong> tap a card from{' '}
          <em>Cards I have spare</em>, then multi-select which of{' '}
          <em>my missing</em> you'd send my way.
        </li>
      </ul>

      <p className="mt-3 text-xs font-semibold text-neutral-800">
        Per-trade ratio (one side must equal 1)
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-neutral-600">
        <li>
          <strong>1 of yours → up to 5 of mine</strong> (offer one card I need
          for up to five of my spares).
        </li>
        <li>
          <strong>Many of yours → exactly 1 of mine</strong> (sweeten the deal:
          send several cards I need for one specific spare of mine).
        </li>
      </ul>

      <p className="mt-3 text-xs font-semibold text-neutral-800">Other things to know</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-neutral-600">
        <li>
          You can <strong>bundle multiple trades</strong> into a single proposal
          — add as many trades as you want before submitting.
        </li>
        <li>
          Everything is <strong>editable before you submit</strong>: remove
          cards, change quantities, or scrap a trade and start over.
        </li>
        <li>
          After submitting you can't edit, but you'll get a tracking link and
          can withdraw if you change your mind.
        </li>
      </ul>

      <p className="mt-3 text-xs text-neutral-500">
        Whether to accept is up to me — your proposal lands in my inbox and I'll
        review it.
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

function scrollStickyIntoView(el: HTMLElement | null) {
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 60
  window.scrollTo({ top, behavior: 'smooth' })
}

function MissingSection() {
  const stickers = useStickersMap()
  const { incoming } = useReservations()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const stickyRef = useRef<HTMLDivElement>(null)

  function handleQueryChange(v: string) {
    if (query.length === 0 && v.length > 0) {
      scrollStickyIntoView(stickyRef.current)
    }
    setQuery(v)
  }

  function handleModeChange(m: SearchMode) {
    setMode(m)
    setQuery('')
  }

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
      <div
        ref={stickyRef}
        className="sticky top-[60px] z-10 -mx-4 bg-neutral-50 px-4 pb-2 pt-1 md:-mx-6 md:px-6"
      >
        <header className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              Cards I'm missing ({items.length})
            </h2>
            <ModeToggle mode={mode} onChange={handleModeChange} />
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            You might have one of these? Search or scroll, then tap to start a swap.
          </p>
        </header>
        {mode === 'code' ? (
          <CodeSearchInput value={query} onChange={handleQueryChange} />
        ) : (
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Player, team…"
          />
        )}
      </div>
      <div className="mt-3 flex flex-col gap-4">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">No matches</p>
        ) : (
          grouped.map(({ team, items }) => (
            <section key={team.code}>
              <div className="mb-1 flex items-center gap-2 px-1 py-0.5">
                <Flag code={team.code} className="h-4 w-6 shrink-0" />
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {team.name}
                </span>
                <GroupPill group={team.group} />
              </div>
              <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {items.map((s, idx) => (
                  <li
                    key={s.code}
                    className={cn(
                      idx !== items.length - 1 && 'border-b border-neutral-100',
                    )}
                  >
                    <Link
                      to={`/market/new?offer=${s.code}`}
                      className="flex items-center gap-3 px-3 py-2 text-left active:bg-neutral-50 hover:bg-neutral-50"
                    >
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-200 px-1.5 text-[11px] font-bold text-neutral-700">
                        {s.num}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                        {labelFor(s.code, s.num, s.name)}
                      </span>
                      {(incoming.get(s.code) ?? 0) > 0 && (
                        <ReservationBadge kind="incoming" reserved={incoming.get(s.code)} />
                      )}
                      <span className="text-xs tabular-nums text-neutral-400">{s.code}</span>
                    </Link>
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
  const stickyRef = useRef<HTMLDivElement>(null)

  function handleQueryChange(v: string) {
    if (query.length === 0 && v.length > 0) {
      scrollStickyIntoView(stickyRef.current)
    }
    setQuery(v)
  }

  function handleModeChange(m: SearchMode) {
    setMode(m)
    setQuery('')
  }

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
      <div
        ref={stickyRef}
        className="sticky top-[60px] z-10 -mx-4 bg-neutral-50 px-4 pb-2 pt-1 md:-mx-6 md:px-6"
      >
        <header className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              Cards I have spare ({totalSpare})
            </h2>
            <ModeToggle mode={mode} onChange={handleModeChange} />
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Anything you want? Tap to include it in your proposal.
          </p>
        </header>
        {mode === 'code' ? (
          <CodeSearchInput value={query} onChange={handleQueryChange} />
        ) : (
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Player, team…"
          />
        )}
      </div>
      <div className="mt-3 flex flex-col gap-4">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">No matches</p>
        ) : (
          grouped.map(({ team, items }) => (
            <section key={team.code}>
              <div className="mb-1 flex items-center gap-2 px-1 py-0.5">
                <Flag code={team.code} className="h-4 w-6 shrink-0" />
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {team.name}
                </span>
                <GroupPill group={team.group} />
              </div>
              <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {items.map((s, idx) => {
                  const reserved = outgoing.get(s.code) ?? 0
                  const allReserved = s.available === 0
                  const Row = (
                    <>
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-200 px-1.5 text-[11px] font-bold text-neutral-700">
                        {s.num}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-neutral-900">
                          {labelFor(s.code, s.num, s.name)}
                        </div>
                        <div className="text-[11px] tabular-nums text-neutral-500">
                          {s.available} of {s.count - 1} spare
                        </div>
                      </div>
                      {allReserved ? (
                        <ReservationBadge kind="all-reserved" />
                      ) : reserved > 0 ? (
                        <ReservationBadge kind="partial-reserved" reserved={reserved} />
                      ) : null}
                      <span className="text-xs tabular-nums text-neutral-400">{s.code}</span>
                    </>
                  )
                  return (
                    <li
                      key={s.code}
                      className={cn(
                        idx !== items.length - 1 && 'border-b border-neutral-100',
                      )}
                    >
                      {allReserved ? (
                        <div className="flex items-center gap-3 px-3 py-2 opacity-60">
                          {Row}
                        </div>
                      ) : (
                        <Link
                          to={`/market/new?want=${s.code}`}
                          className="flex items-center gap-3 px-3 py-2 active:bg-neutral-50 hover:bg-neutral-50"
                        >
                          {Row}
                        </Link>
                      )}
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
