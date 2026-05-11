import { Check, Send } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { CodeSearchInput } from '@/components/CodeSearchInput'
import { Flag } from '@/components/Flag'
import { LangToggle } from '@/components/public/LangToggle'
import { SuccessModal, type SubmittedRequest } from '@/components/public/SubmitModal'
import { SearchBar } from '@/components/SearchBar'
import { SearchModeToggle, type SearchMode } from '@/components/SearchModeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TEAMS, stickerKind, type Team } from '@/data/teams'
import { usePublicLocks } from '@/lib/locks'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { usePublicLocale, usePublicT } from '@/lib/publicI18n'
import { useStickersMap } from '@/lib/state'
import { submitRequest } from '@/lib/submissions'
import { cn } from '@/lib/utils'

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
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const [selectedNeed, setSelectedNeed] = useState<Set<string>>(new Set())
  const [selectedHave, setSelectedHave] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<SubmittedRequest | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Admin missing (count=0) → visitor's "I have" column.
  const adminMissing = useMemo<Item[]>(() => {
    const out: Item[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        if ((locks.incoming.get(code) ?? 0) > 0) continue
        if (!sticker || sticker.count === 0) {
          out.push({ code, teamCode: team.code, num: i, name: sticker?.name ?? null, count: 0 })
        }
      }
    }
    return out
  }, [stickers, locks])

  // Admin doubles → visitor's "I need" column.
  const adminDoubles = useMemo<Item[]>(() => {
    const out: Item[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        if (!sticker) continue
        const lockedOut = locks.outgoing.get(code) ?? 0
        const effective = sticker.count - lockedOut
        if (effective < 2) continue
        out.push({ code, teamCode: team.code, num: i, name: sticker.name, count: effective })
      }
    }
    return out
  }, [stickers, locks])

  const needGroups = useMemo(() => groupByTeam(adminDoubles, query, mode), [adminDoubles, query, mode])
  const haveGroups = useMemo(() => groupByTeam(adminMissing, query, mode), [adminMissing, query, mode])

  function toggleNeed(code: string) {
    setSelectedNeed((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }
  function toggleHave(code: string) {
    setSelectedHave((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
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

  async function handleSubmit() {
    setError(null)
    const totalSelected = selectedNeed.size + selectedHave.size
    if (totalSelected === 0) {
      setError(t('public.submit.zero'))
      return
    }
    if (name.trim().length === 0) {
      setError(t('public.requiredName'))
      return
    }
    if (contact.trim().length === 0) {
      setError(t('public.requiredContact'))
      return
    }
    setSubmitting(true)
    try {
      const theyHave = Array.from(selectedHave)
      const theyWant = Array.from(selectedNeed)
      const id = await submitRequest({ name, contact, note, theyHave, theyWant, locale })
      setSubmitted({ id, theyHave, theyWant })
    } catch (e) {
      console.error(e)
      setError(t('public.modal.error'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleAnother() {
    setSelectedHave(new Set())
    setSelectedNeed(new Set())
    setName('')
    setContact('')
    setNote('')
    setError(null)
    setSubmitted(null)
  }

  const totalSelected = selectedNeed.size + selectedHave.size
  const bothEmpty = adminDoubles.length === 0 && adminMissing.length === 0

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-neutral-50 pb-32" ref={containerRef}>
      <div
        className="sticky top-0 z-20 flex flex-col gap-2.5 border-b border-neutral-200 bg-neutral-50 px-4 pb-2.5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-neutral-900">{t('public.title')}</h1>
            <p className="text-[11px] leading-snug text-neutral-600">{t('public.subtitle')}</p>
          </div>
          <LangToggle className="shrink-0" />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            {mode === 'code' ? (
              <CodeSearchInput value={query} onChange={handleQueryChange} />
            ) : (
              <SearchBar value={query} onChange={handleQueryChange} placeholder={t('public.search.name')} />
            )}
          </div>
          <SearchModeToggle mode={mode} onChange={handleModeChange} />
        </div>

        <ContactSection
          name={name}
          setName={setName}
          contact={contact}
          setContact={setContact}
          note={note}
          setNote={setNote}
        />

        {!bothEmpty && (
          <div className="grid grid-cols-2 gap-2">
            <ColumnHeader title={t('public.col.iNeed')} count={selectedNeed.size} />
            <ColumnHeader title={t('public.col.iHave')} count={selectedHave.size} />
          </div>
        )}
      </div>

      <div className="px-4 pt-3">
        {bothEmpty ? (
          <div className="flex min-h-[30vh] items-center justify-center px-4 py-12 text-center text-sm text-neutral-500">
            {adminMissing.length === 0 ? t('public.albumComplete') : t('public.noDoubles')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <ColumnList
              groups={needGroups}
              selected={selectedNeed}
              onToggle={toggleNeed}
              showSpareCount
            />
            <ColumnList
              groups={haveGroups}
              selected={selectedHave}
              onToggle={toggleHave}
            />
          </div>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        {error && (
          <p className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
            {error}
          </p>
        )}
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || totalSelected === 0}
          className="h-12 w-full text-base"
        >
          <Send className="h-4 w-4" />
          {submitting
            ? t('public.modal.sending')
            : totalSelected === 0
              ? t('public.submit.zero')
              : t('public.submit', { count: totalSelected })}
        </Button>
      </div>

      {submitted && <SuccessModal submitted={submitted} onAnother={handleAnother} />}
    </div>
  )
}

function ContactSection({
  name,
  setName,
  contact,
  setContact,
  note,
  setNote,
}: {
  name: string
  setName: (v: string) => void
  contact: string
  setContact: (v: string) => void
  note: string
  setNote: (v: string) => void
}) {
  const t = usePublicT()
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('public.modal.namePh')}
        maxLength={80}
        autoComplete="name"
        className="h-9 text-xs"
      />
      <Input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder={t('public.modal.contactPh')}
        maxLength={200}
        className="h-9 text-xs"
      />
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('public.modal.notePh')}
        maxLength={500}
        className="col-span-2 h-9 text-xs"
      />
    </div>
  )
}

function ColumnHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-start justify-between gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5">
      <p className="text-[11px] font-medium leading-snug text-neutral-800">{title}</p>
      {count > 0 && (
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </div>
  )
}

function ColumnList({
  groups,
  selected,
  onToggle,
  showSpareCount,
}: {
  groups: { team: Team; items: Item[] }[]
  selected: Set<string>
  onToggle: (code: string) => void
  showSpareCount?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {groups.length === 0 ? (
        <p className="py-4 text-center text-[11px] italic text-neutral-400">—</p>
      ) : (
        groups.map(({ team, items }) => (
          <section key={team.code} className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5">
              <Flag code={team.code} className="h-3 w-4 shrink-0" />
              <span className="min-w-0 truncate text-[11px] font-semibold text-neutral-900">
                {team.name}
              </span>
              <span className="ml-auto text-[10px] tabular-nums text-neutral-400">
                {items.length}
              </span>
            </div>
            <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {items.map((it, idx) => {
                const isSelected = selected.has(it.code)
                const label = labelFor(it.code, it.num, it.name)
                return (
                  <li
                    key={it.code}
                    className={cn(
                      idx !== items.length - 1 && 'border-b border-neutral-100',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(it.code)}
                      className={cn(
                        'flex w-full items-center gap-2 px-2 py-1.5 text-left active:bg-neutral-50',
                        isSelected && 'bg-emerald-50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-neutral-300 bg-white',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono text-xs font-bold text-neutral-900">
                            {it.code}
                          </span>
                          {showSpareCount && it.count >= 2 && (
                            <span className="text-[9px] font-semibold tabular-nums text-amber-700">
                              ×{it.count - 1}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[10px] leading-tight text-neutral-500">
                          {label}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
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
