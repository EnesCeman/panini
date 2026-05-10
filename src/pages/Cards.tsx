import { ArrowUpDown, ClipboardList, GitCompare, Inbox, Lock } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { BulkAdjuster } from '@/components/BulkAdjuster'
import { CodeChecker } from '@/components/CodeChecker'
import { CodeSearchInput } from '@/components/CodeSearchInput'
import { OverlapChecker } from '@/components/OverlapChecker'
import { Flag } from '@/components/Flag'
import { SearchBar } from '@/components/SearchBar'
import { SearchModeToggle, type SearchMode } from '@/components/SearchModeToggle'
import { StickerSheet } from '@/components/StickerSheet'
import { TEAMS, stickerKind, type Team } from '@/data/teams'
import { ALBUM_PLAYER_NAMES } from '@/data/playerNames'
import { useAdminLocks, type LockedTradeRef } from '@/lib/locks'
import { normalizeForSearch } from '@/lib/normalize'
import { cn } from '@/lib/utils'
import { useStickersMap } from '@/lib/state'
import { useTrades } from '@/lib/trades'

type CardKind = 'badge' | 'team_photo' | 'player'

type CardEntry = {
  code: string
  num: number
  name: string
  team: Team
  count: number
  kind: CardKind
  source: 'user' | 'album' | 'derived' | 'none'
}

function deriveCardName(team: Team, num: number, code: string, userName: string | null) {
  const kind = stickerKind(num)
  if (kind === 'badge') {
    return { name: `${team.name} badge`, source: 'derived' as const, kind }
  }
  if (kind === 'team_photo') {
    return { name: `${team.name} team photo`, source: 'derived' as const, kind }
  }
  const albumName = ALBUM_PLAYER_NAMES[code]
  if (userName && userName.length > 0) {
    return { name: userName, source: 'user' as const, kind }
  }
  if (albumName) {
    return { name: albumName, source: 'album' as const, kind }
  }
  return { name: code, source: 'none' as const, kind }
}

export function Cards() {
  const stickers = useStickersMap()
  const trades = useTrades()
  const locks = useAdminLocks(trades)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [overlapOpen, setOverlapOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleQueryChange(v: string) {
    setQuery(v)
    if (v.length > 0 && containerRef.current) {
      const target = containerRef.current.getBoundingClientRect().top + window.scrollY
      if (window.scrollY > target) {
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
    }
  }

  const allCards = useMemo<CardEntry[]>(() => {
    const list: CardEntry[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        const userName = sticker?.name ?? null
        const { name, source, kind } = deriveCardName(team, i, code, userName)
        list.push({
          code,
          num: i,
          name,
          team,
          count: sticker?.count ?? 0,
          kind,
          source,
        })
      }
    }
    return list
  }, [stickers])

  const filtered = useMemo(() => {
    let base = allCards
    if (query.length > 0) {
      if (mode === 'code') {
        const q = query.toUpperCase()
        base = base.filter((c) => c.code.toUpperCase().includes(q))
      } else {
        const q = normalizeForSearch(query)
        base = base.filter(
          (c) =>
            normalizeForSearch(c.name).includes(q) ||
            normalizeForSearch(c.team.name).includes(q),
        )
      }
    }
    const named = base
      .filter((c) => c.source !== 'none')
      .sort((a, b) => a.name.localeCompare(b.name))
    const unnamed = base
      .filter((c) => c.source === 'none')
      .sort((a, b) => a.code.localeCompare(b.code))
    return [...named, ...unnamed]
  }, [allCards, query, mode])

  return (
    <div className="pb-24" ref={containerRef}>
      <header
        className="sticky top-0 z-20 flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-neutral-900">
            Cards <span className="ml-1 text-sm font-normal tabular-nums text-neutral-500">{filtered.length}</span>
          </h1>
          <SearchModeToggle
            mode={mode}
            onChange={(m) => {
              setMode(m)
              setQuery('')
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100"
            aria-label="Bulk code check"
            title="Paste a list of codes from someone, see what you're missing"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Check list
          </button>
          <button
            type="button"
            onClick={() => setAdjustOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100"
            aria-label="Bulk plus or minus one"
            title="Paste codes to apply +1 or -1 to all of them at once (after a swap)"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Bulk ±1
          </button>
          <button
            type="button"
            onClick={() => setOverlapOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100"
            aria-label="Overlap check"
            title="Find codes that appear in both of two lists (spot double-promised stickers)"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Overlap
          </button>
        </div>
        {mode === 'code' ? (
          <CodeSearchInput value={query} onChange={handleQueryChange} />
        ) : (
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Player, team, badge…"
          />
        )}
      </header>

      {filtered.length === 0 ? (
        <EmptyState message="No cards match" />
      ) : (
        <ul className="flex flex-col gap-1.5 px-4 pt-4">
          {filtered.map((c) => (
            <li
              key={c.code}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <button
                type="button"
                onClick={() => setOpenCode(c.code)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-neutral-50"
              >
                <Flag code={c.team.code} className="h-5 w-7" />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'truncate text-sm font-medium',
                      c.source === 'none' ? 'text-neutral-500' : 'text-neutral-900',
                    )}
                  >
                    {c.name}
                  </div>
                  <div className="truncate text-[11px] text-neutral-500">
                    {c.team.name}{' '}
                    {c.source !== 'none' && ` · ${c.code}`}
                    {c.kind === 'badge' && ' · badge'}
                    {c.kind === 'team_photo' && ' · team photo'}
                    {c.source === 'user' && ' · custom'}
                    {c.source === 'none' && ' · no name yet'}
                  </div>
                </div>
                <LockChip
                  outgoing={locks.outgoing.get(c.code)}
                  incoming={locks.incoming.get(c.code)}
                />
                <CountBadge count={c.count} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <StickerSheet code={openCode} onClose={() => setOpenCode(null)} />
      {bulkOpen && <CodeChecker onClose={() => setBulkOpen(false)} />}
      {adjustOpen && <BulkAdjuster onClose={() => setAdjustOpen(false)} />}
      {overlapOpen && <OverlapChecker onClose={() => setOverlapOpen(false)} />}
    </div>
  )
}

function LockChip({
  outgoing,
  incoming,
}: {
  outgoing?: LockedTradeRef[]
  incoming?: LockedTradeRef[]
}) {
  if (incoming && incoming.length > 0) {
    const subj = incoming[0].subject
    const more = incoming.length > 1 ? ` +${incoming.length - 1}` : ''
    return (
      <span
        className="mr-2 inline-flex max-w-[120px] items-center gap-1 truncate rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
        title={incoming.map((r) => r.subject).join(', ')}
      >
        <Inbox className="h-3 w-3 shrink-0" />
        <span className="truncate">{subj}{more}</span>
      </span>
    )
  }
  if (outgoing && outgoing.length > 0) {
    const subj = outgoing[0].subject
    const more = outgoing.length > 1 ? ` +${outgoing.length - 1}` : ''
    return (
      <span
        className="mr-2 inline-flex max-w-[120px] items-center gap-1 truncate rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
        title={outgoing.map((r) => r.subject).join(', ')}
      >
        <Lock className="h-3 w-3 shrink-0" />
        <span className="truncate">{subj}{more}</span>
      </span>
    )
  }
  return null
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-neutral-200 px-2 text-xs font-bold text-neutral-500">
        0
      </span>
    )
  }
  if (count === 1) {
    return (
      <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-bold text-white">
        1
      </span>
    )
  }
  return (
    <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
      x{count}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-12 text-center text-sm text-neutral-500">
      {message}
    </div>
  )
}
