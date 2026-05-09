import { useMemo, useState } from 'react'
import { Flag } from '@/components/Flag'
import { SearchBar } from '@/components/SearchBar'
import { StickerSheet } from '@/components/StickerSheet'
import { TEAMS, stickerKind, type Team } from '@/data/teams'
import { ALBUM_PLAYER_NAMES } from '@/data/playerNames'
import { normalizeForSearch } from '@/lib/normalize'
import { useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

type PlayerEntry = {
  code: string
  num: number
  name: string
  team: Team
  count: number
  source: 'user' | 'album' | 'none'
}

export function Players() {
  const stickers = useStickersMap()
  const [query, setQuery] = useState('')
  const [openCode, setOpenCode] = useState<string | null>(null)

  const allSlots = useMemo<PlayerEntry[]>(() => {
    const list: PlayerEntry[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        if (stickerKind(i) !== 'player') continue
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        const userName = sticker?.name ?? null
        const albumName = ALBUM_PLAYER_NAMES[code]
        const hasUserName = !!(userName && userName.length > 0)
        const name = hasUserName ? userName! : (albumName ?? code)
        const source: PlayerEntry['source'] = hasUserName
          ? 'user'
          : albumName
            ? 'album'
            : 'none'
        list.push({
          code,
          num: i,
          name,
          team,
          count: sticker?.count ?? 0,
          source,
        })
      }
    }
    return list
  }, [stickers])

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query)
    const base =
      q.length === 0
        ? allSlots
        : allSlots.filter(
            (p) =>
              normalizeForSearch(p.name).includes(q) ||
              normalizeForSearch(p.team.name).includes(q) ||
              normalizeForSearch(p.code).includes(q),
          )
    const named = base
      .filter((p) => p.source !== 'none')
      .sort((a, b) => a.name.localeCompare(b.name))
    const unnamed = base
      .filter((p) => p.source === 'none')
      .sort((a, b) => a.code.localeCompare(b.code))
    return [...named, ...unnamed]
  }, [allSlots, query])

  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">Players</h1>
          <span className="text-xs tabular-nums text-neutral-500">{filtered.length}</span>
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search by name, team, or code"
        />
      </header>

      {filtered.length === 0 ? (
        <EmptyState message="No players match" />
      ) : (
        <ul className="flex flex-col gap-1.5 px-4 pt-4">
          {filtered.map((p) => (
            <li key={p.code} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenCode(p.code)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-neutral-50"
              >
                <Flag code={p.team.code} className="h-5 w-7" />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'truncate text-sm font-medium',
                      p.source === 'none' ? 'text-neutral-500' : 'text-neutral-900',
                    )}
                  >
                    {p.name}
                  </div>
                  <div className="truncate text-[11px] text-neutral-500">
                    {p.team.name}
                    {p.source !== 'none' && ` · ${p.code}`}
                    {p.source === 'user' && ' · custom'}
                    {p.source === 'none' && ' · no name yet'}
                  </div>
                </div>
                <CountBadge count={p.count} />
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
      <span
        className={cn(
          'inline-flex h-7 min-w-9 items-center justify-center rounded-full px-2 text-xs font-bold text-white',
          'bg-emerald-600',
        )}
      >
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
