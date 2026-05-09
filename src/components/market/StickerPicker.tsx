import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Flag } from '@/components/Flag'
import { Input } from '@/components/ui/input'
import { TEAMS, stickerKind, teamByCode } from '@/data/teams'
import { applyAutoDash } from '@/lib/autoDash'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

const TEAM_CODE_SET = new Set(TEAMS.map((t) => t.code))

type CandidatesPredicate = (code: string, count: number) => boolean

type Props = {
  predicate: CandidatesPredicate
  onPick: (code: string) => void
  onClose: () => void
  exclude?: Set<string>
  title: string
}

function labelFor(code: string, num: number, name: string | null): string {
  const kind = stickerKind(num)
  if (kind === 'badge') return 'Team badge'
  if (kind === 'team_photo') return 'Team photo'
  return resolvePlayerLabel(code, name)
}

export function StickerPicker({ predicate, onPick, onClose, exclude, title }: Props) {
  const stickers = useStickersMap()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'name' | 'code'>('name')

  const candidates = useMemo(() => {
    const out: { code: string; teamCode: string; num: number; name: string | null }[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        if (exclude?.has(code)) continue
        const sticker = stickers.get(code)
        const count = sticker?.count ?? 0
        if (!predicate(code, count)) continue
        out.push({ code, teamCode: team.code, num: i, name: sticker?.name ?? null })
      }
    }
    return out
  }, [stickers, predicate, exclude])

  const filtered = useMemo(() => {
    if (query.length === 0) return candidates
    if (mode === 'code') {
      const q = query.toUpperCase()
      return candidates.filter((c) => c.code.toUpperCase().includes(q))
    }
    const q = normalizeForSearch(query)
    return candidates.filter((c) => {
      const team = teamByCode(c.teamCode)
      const album = albumPlayerName(c.code)
      return (
        (c.name ? normalizeForSearch(c.name).includes(q) : false) ||
        (album ? normalizeForSearch(album).includes(q) : false) ||
        (team ? normalizeForSearch(team.name).includes(q) : false)
      )
    })
  }, [candidates, query, mode])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1 text-neutral-500"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="border-b border-neutral-100 px-4 py-3">
        <div className="mb-2 flex justify-end">
          <div className="inline-flex overflow-hidden rounded-md border border-neutral-200 text-[11px] font-medium">
            {(['name', 'code'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'px-2 py-1',
                  mode === m ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600',
                )}
              >
                {m === 'name' ? 'Name' : 'Code'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) =>
              setQuery(
                mode === 'code' ? applyAutoDash(e.target.value, TEAM_CODE_SET) : e.target.value,
              )
            }
            placeholder={mode === 'code' ? 'Code, e.g. POR-5' : 'Player or team…'}
            className="pl-9"
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-neutral-500">No matches</li>
        )}
        {filtered.map((c) => {
          const team = teamByCode(c.teamCode)
          return (
            <li key={c.code} className="border-b border-neutral-100">
              <button
                type="button"
                onClick={() => onPick(c.code)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-neutral-50"
              >
                {team && <Flag code={team.code} className="h-4 w-6" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-900">
                    {labelFor(c.code, c.num, c.name)}
                  </div>
                  <div className="text-[11px] text-neutral-500">{c.code}</div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
