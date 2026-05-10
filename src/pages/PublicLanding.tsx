import { Check, Send } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { CodeSearchInput } from '@/components/CodeSearchInput'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { LangToggle } from '@/components/public/LangToggle'
import { SubmitModal } from '@/components/public/SubmitModal'
import { SearchBar } from '@/components/SearchBar'
import { SearchModeToggle, type SearchMode } from '@/components/SearchModeToggle'
import { Button } from '@/components/ui/button'
import { TEAMS, stickerKind, type Team } from '@/data/teams'
import { usePublicLocks } from '@/lib/locks'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { pluralForm, usePublicLocale, usePublicT, type TKey } from '@/lib/publicI18n'
import { useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

type Tab = 'have' | 'want'

type Item = {
  code: string
  teamCode: string
  num: number
  name: string | null
  count: number
}

export function PublicLanding() {
  const t = usePublicT()
  const { locale } = usePublicLocale()
  const stickers = useStickersMap()
  const locks = usePublicLocks()
  const [tab, setTab] = useState<Tab>('want')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const [selectedHave, setSelectedHave] = useState<Set<string>>(new Set())
  const [selectedWant, setSelectedWant] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const allMissing = useMemo<Item[]>(() => {
    const out: Item[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        // Hide cards that are already incoming from a locked pending trade —
        // the visitor shouldn't be able to offer them since they're spoken for.
        if ((locks.incoming.get(code) ?? 0) > 0) continue
        if (!sticker || sticker.count === 0) {
          out.push({ code, teamCode: team.code, num: i, name: sticker?.name ?? null, count: 0 })
        }
      }
    }
    return out
  }, [stickers, locks])

  const allDoubles = useMemo<Item[]>(() => {
    const out: Item[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        if (!sticker) continue
        // Hide cards whose remaining spare (after locked outgoing) is gone.
        const lockedOut = locks.outgoing.get(code) ?? 0
        const effective = sticker.count - lockedOut
        if (effective < 2) continue
        out.push({
          code,
          teamCode: team.code,
          num: i,
          name: sticker.name,
          count: effective,
        })
      }
    }
    return out
  }, [stickers, locks])

  const visibleItems = tab === 'have' ? allMissing : allDoubles
  const grouped = useMemo(() => groupByTeam(visibleItems, query, mode), [visibleItems, query, mode])

  const selected = tab === 'have' ? selectedHave : selectedWant
  const setSelected = tab === 'have' ? setSelectedHave : setSelectedWant

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function clearAll() {
    setSelectedHave(new Set())
    setSelectedWant(new Set())
  }

  function handleQueryChange(v: string) {
    setQuery(v)
    if (v.length > 0 && containerRef.current) {
      const target = containerRef.current.getBoundingClientRect().top + window.scrollY
      if (window.scrollY > target) window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }

  function handleModeChange(m: SearchMode) {
    setMode(m)
    setQuery('')
  }

  const totalSelected = selectedHave.size + selectedWant.size
  const heading = tab === 'have' ? t('public.have.heading') : t('public.want.heading')
  const sub = tab === 'have' ? t('public.have.sub') : t('public.want.sub')
  const emptyMessage =
    tab === 'have' && allMissing.length === 0
      ? t('public.albumComplete')
      : tab === 'want' && allDoubles.length === 0
        ? t('public.noDoubles')
        : t('public.empty')

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-neutral-50 pb-32" ref={containerRef}>
      <header
        className="sticky top-0 z-20 flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-neutral-900">{t('public.title')}</h1>
            <p className="text-[11px] leading-snug text-neutral-600">{t('public.subtitle')}</p>
          </div>
          <LangToggle className="shrink-0" />
        </div>

        <div className="inline-flex w-full overflow-hidden rounded-md border border-neutral-200 text-xs font-medium">
          {(['want', 'have'] as const).map((tk) => {
            const count = tk === 'have' ? selectedHave.size : selectedWant.size
            const label =
              tk === 'have'
                ? t('public.tab.have', { count })
                : t('public.tab.want', { count })
            return (
              <button
                key={tk}
                type="button"
                onClick={() => setTab(tk)}
                className={cn(
                  'flex-1 px-3 py-1.5',
                  tab === tk
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            {mode === 'code' ? (
              <CodeSearchInput value={query} onChange={handleQueryChange} />
            ) : (
              <SearchBar
                value={query}
                onChange={handleQueryChange}
                placeholder={t('public.search.name')}
              />
            )}
          </div>
          <SearchModeToggle mode={mode} onChange={handleModeChange} />
        </div>
      </header>

      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
          {heading}
        </h2>
        <p className="mt-1 text-xs text-neutral-600">{sub}</p>
      </div>

      {grouped.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center px-4 py-12 text-center text-sm text-neutral-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 pt-4">
          {grouped.map(({ team, items }) => (
            <section key={team.code}>
              <div className="mb-2 flex items-center gap-2">
                <Flag code={team.code} className="h-4 w-6 shrink-0" />
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {team.name}
                </span>
                <GroupPill group={team.group} />
                <span className="ml-auto text-xs tabular-nums text-neutral-500">{items.length}</span>
              </div>
              <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {items.map((it, idx) => {
                  const isSelected = selected.has(it.code)
                  return (
                    <li
                      key={it.code}
                      className={cn(
                        idx !== items.length - 1 && 'border-b border-neutral-100',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(it.code)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-neutral-50',
                          isSelected && 'bg-emerald-50',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-200 text-neutral-700',
                          )}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5" /> : it.num}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-neutral-900">
                            {labelFor(it.code, it.num, it.name)}
                          </div>
                          {tab === 'want' && (() => {
                            const spare = it.count - 1
                            const key =
                              `public.spare.${pluralForm(spare, locale)}` as TKey
                            return (
                              <div className="text-[11px] text-neutral-500">
                                {t(key, { count: spare })}
                              </div>
                            )
                          })()}
                        </div>
                        <span className="text-xs tabular-nums text-neutral-400">{it.code}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <Button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={totalSelected === 0}
          className="h-12 w-full text-base"
        >
          <Send className="h-4 w-4" />
          {totalSelected === 0
            ? t('public.submit.zero')
            : t('public.submit', { count: totalSelected })}
        </Button>
      </div>

      {modalOpen && (
        <SubmitModal
          theyHave={Array.from(selectedHave)}
          theyWant={Array.from(selectedWant)}
          onClose={() => setModalOpen(false)}
          onCleared={clearAll}
        />
      )}
    </div>
  )
}

function labelFor(code: string, num: number, name: string | null): string {
  const kind = stickerKind(num)
  if (kind === 'badge') return 'Team badge'
  if (kind === 'team_photo') return 'Team photo'
  return resolvePlayerLabel(code, name) ?? code
}

function groupByTeam(
  items: Item[],
  query: string,
  mode: SearchMode,
): { team: Team; items: Item[] }[] {
  const map = new Map<string, Item[]>()
  for (const item of items) {
    const team = TEAMS.find((tt) => tt.code === item.teamCode)
    if (!team) continue
    if (query.length > 0) {
      let matches: boolean
      if (mode === 'code') {
        matches = item.code.toUpperCase().includes(query.toUpperCase())
      } else {
        const q = normalizeForSearch(query)
        const album = albumPlayerName(item.code)
        matches =
          (!!item.name && normalizeForSearch(item.name).includes(q)) ||
          (!!album && normalizeForSearch(album).includes(q)) ||
          normalizeForSearch(team.name).includes(q)
      }
      if (!matches) continue
    }
    const list = map.get(item.teamCode) ?? []
    list.push(item)
    map.set(item.teamCode, list)
  }
  return TEAMS.map((tt) => ({ team: tt, items: map.get(tt.code) ?? [] }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.team.name.localeCompare(b.team.name))
}
