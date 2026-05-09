import { Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TEAMS, stickerKind, teamByCode } from '@/data/teams'
import { applyAutoDash } from '@/lib/autoDash'
import { useT } from '@/lib/i18n'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

const TEAM_CODE_SET = new Set(TEAMS.map((t) => t.code))

type CandidatesPredicate = (code: string, count: number) => boolean

type SingleProps = {
  multiSelect?: false
  predicate: CandidatesPredicate
  onPick: (code: string) => void
  onClose: () => void
  exclude?: Set<string>
  title: string
}

type MultiProps = {
  multiSelect: true
  predicate: CandidatesPredicate
  onPickMany: (codes: string[]) => void
  onClose: () => void
  exclude?: Set<string>
  title: string
  maxSelection?: number
}

type Props = SingleProps | MultiProps

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

export function StickerPicker(props: Props) {
  const t = useT()
  const stickers = useStickersMap()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'name' | 'code'>('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const isMulti = props.multiSelect === true
  const maxSelection = isMulti ? props.maxSelection : undefined
  const atCap = isMulti && maxSelection !== undefined && selected.size >= maxSelection

  const candidates = useMemo(() => {
    const out: { code: string; teamCode: string; num: number; name: string | null }[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        if (props.exclude?.has(code)) continue
        const sticker = stickers.get(code)
        const count = sticker?.count ?? 0
        if (!props.predicate(code, count)) continue
        out.push({ code, teamCode: team.code, num: i, name: sticker?.name ?? null })
      }
    }
    return out
  }, [stickers, props.predicate, props.exclude])

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

  function handleRowTap(code: string) {
    if (!isMulti) {
      props.onPick(code)
      return
    }
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        if (maxSelection !== undefined && next.size >= maxSelection) return prev
        next.add(code)
      }
      return next
    })
  }

  function handleConfirm() {
    if (!isMulti) return
    if (selected.size === 0) {
      props.onClose()
      return
    }
    props.onPickMany(Array.from(selected))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">{props.title}</h2>
        <button
          type="button"
          onClick={props.onClose}
          aria-label={t('picker.close')}
          className="rounded-full p-1 text-neutral-500"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="border-b border-neutral-100 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          {isMulti ? (
            <p className="text-[11px] text-neutral-500">
              {t('picker.tapToSelect')}{' '}
              {maxSelection !== undefined &&
                t('picker.upTo', { count: maxSelection })}
            </p>
          ) : (
            <span />
          )}
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
                {m === 'name' ? t('search.mode.name') : t('search.mode.code')}
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
            placeholder={
              mode === 'code'
                ? t('search.placeholder.code')
                : t('search.placeholder.name')
            }
            className="pl-9"
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-neutral-500">
            {t('browse.noMatches')}
          </li>
        )}
        {filtered.map((c) => {
          const team = teamByCode(c.teamCode)
          const isSelected = selected.has(c.code)
          const disabled = isMulti && atCap && !isSelected
          return (
            <li key={c.code} className="border-b border-neutral-100">
              <button
                type="button"
                onClick={() => handleRowTap(c.code)}
                disabled={disabled}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left active:bg-neutral-50',
                  isSelected && 'bg-emerald-50',
                  disabled && 'opacity-40',
                )}
              >
                {isMulti && (
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-neutral-300 bg-white',
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                )}
                {team && <Flag code={team.code} className="h-4 w-6" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-900">
                    {labelFor(c.code, c.num, c.name, t)}
                  </div>
                  <div className="text-[11px] text-neutral-500">{c.code}</div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {isMulti && (
        <div
          className="sticky bottom-0 border-t border-neutral-200 bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <Button
            type="button"
            disabled={selected.size === 0}
            onClick={handleConfirm}
            className="w-full"
          >
            {t('picker.add', { count: selected.size })}
          </Button>
        </div>
      )}
    </div>
  )
}
