import { useMemo, useRef, useState } from 'react'
import { CodeSearchInput } from '@/components/CodeSearchInput'
import { Flag } from '@/components/Flag'
import { SearchBar } from '@/components/SearchBar'
import { SearchModeToggle, type SearchMode } from '@/components/SearchModeToggle'
import { StickerSheet } from '@/components/StickerSheet'
import { TEAMS, stickerKind, type Team } from '@/data/teams'
import { ALBUM_PLAYER_NAMES } from '@/data/playerNames'
import { normalizeForSearch } from '@/lib/normalize'
import { cn } from '@/lib/utils'
import { useStickersMap } from '@/lib/state'

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
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const [openCode, setOpenCode] = useState<string | null>(null)
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
          <h1 className="text-lg font-semibold text-neutral-900">Cards</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-neutral-500">{filtered.length}</span>
            <SearchModeToggle
              mode={mode}
              onChange={(m) => {
                setMode(m)
                setQuery('')
              }}
            />
          </div>
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
                    {c.team.name}
                    {c.source !== 'none' && ` · ${c.code}`}
                    {c.kind === 'badge' && ' · badge'}
                    {c.kind === 'team_photo' && ' · team photo'}
                    {c.source === 'user' && ' · custom'}
                    {c.source === 'none' && ' · no name yet'}
                  </div>
                </div>
                <CountBadge count={c.count} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <StickerSheet code={openCode} onClose={() => setOpenCode(null)} />
    </div>
  )
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
