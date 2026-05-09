import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CodeSearchInput } from '@/components/CodeSearchInput'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { SearchBar } from '@/components/SearchBar'
import { ReservationBadge } from '@/components/market/ReservationBadge'
import { Button } from '@/components/ui/button'
import { TEAMS, stickerKind, type Team } from '@/data/teams'
import { useT } from '@/lib/i18n'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { availableSpare } from '@/lib/reservations'
import { useReservations, useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

type SearchMode = 'name' | 'code'
type MobileTab = 'spares' | 'missing'

type Item = {
  code: string
  teamCode: string
  num: number
  name: string | null
}

function labelFor(
  code: string,
  num: number,
  name: string | null,
  t: ReturnType<typeof useT>,
): string {
  const kind = stickerKind(num)
  if (kind === 'badge') return t('card.badge')
  if (kind === 'team_photo') return t('card.teamPhoto')
  return resolvePlayerLabel(code, name)
}

function useIsMobile(): boolean {
  const query = '(max-width: 767px)'
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isMobile
}

export function Browse() {
  const t = useT()
  const stickers = useStickersMap()
  const [tab, setTab] = useState<MobileTab>('spares')

  const totals = useMemo(() => {
    let missing = 0
    let spareUnits = 0
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        if (!sticker || sticker.count === 0) missing += 1
        if (sticker && sticker.count >= 2) spareUnits += sticker.count - 1
      }
    }
    return { missing, spareUnits }
  }, [stickers])

  return (
    <div className="flex flex-col gap-6 px-4 pt-3 md:px-6">
      <Intro />
      <MobileTabBar tab={tab} onChange={setTab} totals={totals} />
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-6">
        <div className={cn('md:block', tab !== 'spares' && 'hidden')}>
          <DoublesSection />
        </div>
        <div className={cn('md:block', tab !== 'missing' && 'hidden')}>
          <MissingSection />
        </div>
      </div>
      <Link to="/market/new" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <Button className="rounded-full shadow-lg">
          {t('browse.cta.buildCustom')}
        </Button>
      </Link>
    </div>
  )
}

function MobileTabBar({
  tab,
  onChange,
  totals,
}: {
  tab: MobileTab
  onChange: (t: MobileTab) => void
  totals: { missing: number; spareUnits: number }
}) {
  const t = useT()
  return (
    <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 md:hidden">
      <TabButton active={tab === 'spares'} onClick={() => onChange('spares')}>
        {t('browse.tab.spares', { count: totals.spareUnits })}
      </TabButton>
      <TabButton active={tab === 'missing'} onClick={() => onChange('missing')}>
        {t('browse.tab.missing', { count: totals.missing })}
      </TabButton>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
        active ? 'bg-neutral-900 text-white' : 'text-neutral-600',
      )}
    >
      {children}
    </button>
  )
}

function Intro() {
  const t = useT()
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
      <p className="font-semibold">{t('browse.intro.title')}</p>
      <p className="mt-2 text-xs text-neutral-600">{t('browse.intro.lead')}</p>

      <p className="mt-3 text-xs font-semibold text-neutral-800">
        {t('browse.intro.howTitle')}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-neutral-600">
        <li>{t('browse.intro.howOffer')}</li>
        <li>{t('browse.intro.howWant')}</li>
      </ul>

      <p className="mt-3 text-xs font-semibold text-neutral-800">
        {t('browse.intro.ratioTitle')}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-neutral-600">
        <li>{t('browse.intro.ratio1m')}</li>
        <li>{t('browse.intro.ratioN1')}</li>
      </ul>

      <p className="mt-3 text-xs font-semibold text-neutral-800">
        {t('browse.intro.otherTitle')}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-neutral-600">
        <li>{t('browse.intro.otherBundle')}</li>
        <li>{t('browse.intro.otherEdit')}</li>
        <li>{t('browse.intro.otherWithdraw')}</li>
      </ul>

      <p className="mt-3 text-xs text-neutral-500">{t('browse.intro.outro')}</p>
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
  const t = useT()
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
          {m === 'name' ? t('search.mode.name') : t('search.mode.code')}
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

// Scrolls so the sticky search bar pins at top:60 and the section's
// title/subtitle (which now sit ABOVE the sticky search bar) are tucked
// under the page header. We anchor on the results container — its
// natural top minus the sticky bar's height equals the scroll position
// where the sticky bar is right at top:60. Only pull UP — never yank
// the user down if they're already above.
function ensureResultsAtTop(
  resultsEl: HTMLElement | null,
  stickyEl: HTMLElement | null,
) {
  if (!resultsEl || !stickyEl) return
  const stickyHeight = stickyEl.getBoundingClientRect().height
  const resultsDocTop = resultsEl.getBoundingClientRect().top + window.scrollY
  const target = resultsDocTop - 60 - stickyHeight
  if (window.scrollY > target) {
    window.scrollTo({ top: target, behavior: 'smooth' })
  }
}

function CollapsibleTeamGroup({
  team,
  count,
  isOpen,
  onToggle,
  children,
}: {
  team: Team
  count: number
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className="-mx-1 flex w-full items-center gap-2 rounded px-1 py-1 text-left active:bg-neutral-100"
      >
        <Flag code={team.code} className="h-4 w-6 shrink-0" />
        <span className="truncate text-sm font-semibold text-neutral-900">
          {team.name}
        </span>
        <GroupPill group={team.group} />
        <span className="ml-auto text-xs tabular-nums text-neutral-500">{count}</span>
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-neutral-400 transition-transform',
            isOpen && 'rotate-90',
          )}
          strokeWidth={2.5}
        />
      </button>
      {isOpen && <div className="mt-1">{children}</div>}
    </section>
  )
}

function MissingSection() {
  const t = useT()
  const stickers = useStickersMap()
  const { incoming } = useReservations()
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map())
  const stickyRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  function handleQueryChange(v: string) {
    setQuery(v)
    if (v.length > 0) {
      ensureResultsAtTop(resultsRef.current, stickyRef.current)
    }
  }

  function handleModeChange(m: SearchMode) {
    setMode(m)
    setQuery('')
  }

  function toggleTeam(teamCode: string, currentlyOpen: boolean) {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(teamCode, !currentlyOpen)
      return next
    })
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

  const searching = query.length > 0

  return (
    <section>
      <header className="mb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            {t('browse.section.missing.title', { count: items.length })}
          </h2>
          <ModeToggle mode={mode} onChange={handleModeChange} />
        </div>
        <p className="mt-1 text-[11px] text-neutral-500">
          {t('browse.section.missing.subtitle')}
        </p>
      </header>
      <div
        ref={stickyRef}
        className="sticky top-[60px] z-10 -mx-4 bg-neutral-50 px-4 pb-2 pt-1 md:-mx-6 md:px-6"
      >
        {mode === 'code' ? (
          <CodeSearchInput value={query} onChange={handleQueryChange} />
        ) : (
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder={t('search.placeholder.name')}
          />
        )}
      </div>
      <div ref={resultsRef} className="mt-3 flex flex-col gap-2">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">
            {t('browse.noMatches')}
          </p>
        ) : (
          grouped.map(({ team, items: teamItems }) => {
            const hasIncoming = teamItems.some((i) => (incoming.get(i.code) ?? 0) > 0)
            const override = overrides.get(team.code)
            const isOpen = searching
              ? true
              : override !== undefined
                ? override
                : hasIncoming
                  ? true
                  : !isMobile
            return (
              <CollapsibleTeamGroup
                key={team.code}
                team={team}
                count={teamItems.length}
                isOpen={isOpen}
                onToggle={() => toggleTeam(team.code, isOpen)}
              >
                <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  {teamItems.map((s, idx) => (
                    <li
                      key={s.code}
                      className={cn(
                        idx !== teamItems.length - 1 && 'border-b border-neutral-100',
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
                          {labelFor(s.code, s.num, s.name, t)}
                        </span>
                        {(incoming.get(s.code) ?? 0) > 0 && (
                          <ReservationBadge
                            kind="incoming"
                            reserved={incoming.get(s.code)}
                          />
                        )}
                        <span className="text-xs tabular-nums text-neutral-400">
                          {s.code}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CollapsibleTeamGroup>
            )
          })
        )}
      </div>
    </section>
  )
}

function DoublesSection() {
  const t = useT()
  const stickers = useStickersMap()
  const { outgoing } = useReservations()
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map())
  const stickyRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  function handleQueryChange(v: string) {
    setQuery(v)
    if (v.length > 0) {
      ensureResultsAtTop(resultsRef.current, stickyRef.current)
    }
  }

  function handleModeChange(m: SearchMode) {
    setMode(m)
    setQuery('')
  }

  function toggleTeam(teamCode: string, currentlyOpen: boolean) {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(teamCode, !currentlyOpen)
      return next
    })
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
  const searching = query.length > 0

  return (
    <section>
      <header className="mb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            {t('browse.section.spares.title', { count: totalSpare })}
          </h2>
          <ModeToggle mode={mode} onChange={handleModeChange} />
        </div>
        <p className="mt-1 text-[11px] text-neutral-500">
          {t('browse.section.spares.subtitle')}
        </p>
      </header>
      <div
        ref={stickyRef}
        className="sticky top-[60px] z-10 -mx-4 bg-neutral-50 px-4 pb-2 pt-1 md:-mx-6 md:px-6"
      >
        {mode === 'code' ? (
          <CodeSearchInput value={query} onChange={handleQueryChange} />
        ) : (
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder={t('search.placeholder.name')}
          />
        )}
      </div>
      <div ref={resultsRef} className="mt-3 flex flex-col gap-2">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">
            {t('browse.noMatches')}
          </p>
        ) : (
          grouped.map(({ team, items: teamItems }) => {
            const hasReservations = teamItems.some((s) => {
              const reserved = outgoing.get(s.code) ?? 0
              return reserved > 0 || s.available === 0
            })
            const override = overrides.get(team.code)
            const isOpen = searching
              ? true
              : override !== undefined
                ? override
                : hasReservations
                  ? true
                  : !isMobile
            return (
              <CollapsibleTeamGroup
                key={team.code}
                team={team}
                count={teamItems.length}
                isOpen={isOpen}
                onToggle={() => toggleTeam(team.code, isOpen)}
              >
                <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  {teamItems.map((s, idx) => {
                    const reserved = outgoing.get(s.code) ?? 0
                    const allReserved = s.available === 0
                    const Row = (
                      <>
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-200 px-1.5 text-[11px] font-bold text-neutral-700">
                          {s.num}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-neutral-900">
                            {labelFor(s.code, s.num, s.name, t)}
                          </div>
                          <div className="text-[11px] tabular-nums text-neutral-500">
                            {s.available} of {s.count - 1} spare
                          </div>
                        </div>
                        {allReserved ? (
                          <ReservationBadge kind="all-reserved" />
                        ) : reserved > 0 ? (
                          <ReservationBadge
                            kind="partial-reserved"
                            reserved={reserved}
                          />
                        ) : null}
                        <span className="text-xs tabular-nums text-neutral-400">
                          {s.code}
                        </span>
                      </>
                    )
                    return (
                      <li
                        key={s.code}
                        className={cn(
                          idx !== teamItems.length - 1 &&
                            'border-b border-neutral-100',
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
              </CollapsibleTeamGroup>
            )
          })
        )}
      </div>
    </section>
  )
}
