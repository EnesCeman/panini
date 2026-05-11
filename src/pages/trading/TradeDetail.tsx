import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardCheck,
  Copy,
  Download,
  Lock,
  Trash2,
  Unlock,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TEAMS } from '@/data/teams'
import { findGetOverlaps, findGiveOverlaps } from '@/lib/locks'
import { parseCodes } from '@/lib/parseCodes'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { formatGroupedCodes } from '@/lib/submissions'
import {
  deleteTrade,
  subscribeTrades,
  updateTrade,
  useTrade,
  useTrades,
  type TradeStatus,
} from '@/lib/trades'
import { cn } from '@/lib/utils'

const TEAM_BY_CODE = new Map(TEAMS.map((t) => [t.code, t]))

const STATUS_OPTIONS: { value: TradeStatus; label: string; activeCls: string }[] = [
  { value: 'pending', label: 'Pending', activeCls: 'bg-amber-500 text-white' },
  { value: 'completed', label: 'Completed', activeCls: 'bg-emerald-600 text-white' },
  { value: 'cancelled', label: "Didn't happen", activeCls: 'bg-rose-600 text-white' },
]

export function TradeDetail() {
  const { id } = useParams<{ id: string }>()
  const trade = useTrade(id)
  const allTrades = useTrades()
  const stickers = useStickersMap()
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = subscribeTrades()
    return () => unsub()
  }, [])

  const [subject, setSubject] = useState('')
  const [contact, setContact] = useState('')
  const [location, setLocation] = useState('')
  const [giveText, setGiveText] = useState('')
  const [getText, setGetText] = useState('')
  const [notes, setNotes] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const lastIdRef = useRef<string | null>(null)
  const flashTimerRef = useRef<number | null>(null)

  // Sync local edit state from the trade only when we open a different one.
  useEffect(() => {
    if (!trade) return
    if (lastIdRef.current === trade.id) return
    setSubject(trade.subject)
    setContact(trade.contact)
    setLocation(trade.location)
    setGiveText(formatGroupedCodes(trade.give))
    setGetText(formatGroupedCodes(trade.get))
    setNotes(trade.notes)
    lastIdRef.current = trade.id
  }, [trade])

  function flashSaved() {
    setSavedFlash(true)
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current)
    flashTimerRef.current = window.setTimeout(() => setSavedFlash(false), 1500)
  }

  async function saveSubject() {
    if (!trade) return
    const next = subject.trim()
    if (next === trade.subject) return
    setSubject(next)
    try {
      await updateTrade(trade.id, { subject: next })
      flashSaved()
    } catch (e) {
      console.error(e)
    }
  }

  async function saveContact() {
    if (!trade) return
    const next = contact.trim()
    if (next === trade.contact) return
    setContact(next)
    try {
      await updateTrade(trade.id, { contact: next })
      flashSaved()
    } catch (e) {
      console.error(e)
    }
  }

  async function saveLocation() {
    if (!trade) return
    const next = location.trim()
    if (next === trade.location) return
    setLocation(next)
    try {
      await updateTrade(trade.id, { location: next })
      flashSaved()
    } catch (e) {
      console.error(e)
    }
  }

  async function saveCodes(field: 'give' | 'get', text: string) {
    if (!trade) return
    const parsed = parseCodes(text).valid
    const current = trade[field]
    if (arraysEqual(parsed, current)) return
    try {
      await updateTrade(trade.id, { [field]: parsed })
      flashSaved()
    } catch (e) {
      console.error(e)
    }
  }

  async function removeCode(field: 'give' | 'get', code: string) {
    if (!trade) return
    const next = trade[field].filter((c) => c !== code)
    if (next.length === trade[field].length) return
    try {
      await updateTrade(trade.id, { [field]: next })
      const reformatted = formatGroupedCodes(next)
      if (field === 'give') setGiveText(reformatted)
      else setGetText(reformatted)
      flashSaved()
    } catch (e) {
      console.error(e)
    }
  }

  async function saveNotes() {
    if (!trade) return
    if (notes === trade.notes) return
    try {
      await updateTrade(trade.id, { notes })
      flashSaved()
    } catch (e) {
      console.error(e)
    }
  }

  async function setStatus(s: TradeStatus) {
    if (!trade || trade.status === s) return
    try {
      await updateTrade(trade.id, { status: s })
      flashSaved()
    } catch (e) {
      console.error(e)
    }
  }

  async function toggleLock() {
    if (!trade) return
    try {
      await updateTrade(trade.id, { locked: !trade.locked })
      flashSaved()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDelete() {
    if (!trade) return
    if (!window.confirm('Delete this trade? This cannot be undone.')) return
    try {
      await deleteTrade(trade.id)
      navigate('/trading')
    } catch (e) {
      console.error(e)
    }
  }

  function handleCsv() {
    if (!trade) return
    const giveRows = buildRows(trade.give, stickers)
    const getRows = buildRows(trade.get, stickers)
    const lines = ['Code,Team,Num,Name,Side']
    for (const r of giveRows) {
      lines.push(
        [r.code, csvEscape(r.teamName), r.num.toString(), csvEscape(r.name), 'Give'].join(','),
      )
    }
    for (const r of getRows) {
      lines.push(
        [r.code, csvEscape(r.teamName), r.num.toString(), csvEscape(r.name), 'Get'].join(','),
      )
    }
    const csv = lines.join('\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trade-${slug(trade.subject)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (!trade) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-500">
        <p>Trade not found.</p>
        <Link to="/trading" className="text-neutral-900 underline">Back to Trading</Link>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) navigate(-1)
            else navigate('/trading')
          }}
          className="rounded-full p-1.5 text-neutral-600 hover:bg-neutral-200"
          aria-label="Back to Trading"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={() => void saveSubject()}
          maxLength={120}
          placeholder="Subject — with whom or what (e.g. Marko on Facebook)"
          className="flex-1 border-0 bg-transparent text-base font-semibold shadow-none focus-visible:bg-white"
        />
        <span
          className={cn(
            'text-[10px] font-medium uppercase tracking-wider transition-opacity',
            savedFlash ? 'text-emerald-600 opacity-100' : 'opacity-0',
          )}
        >
          Saved
        </span>
      </header>

      <div className="px-4 pt-4">
        <div className="inline-flex w-full overflow-hidden rounded-md border border-neutral-200 text-xs font-medium">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => void setStatus(opt.value)}
              className={cn(
                'flex-1 px-3 py-1.5',
                trade.status === opt.value
                  ? opt.activeCls
                  : 'bg-white text-neutral-600 hover:bg-neutral-100',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <LockSection
        trade={trade}
        allTrades={allTrades}
        stickers={stickers}
        onToggle={() => void toggleLock()}
      />

      <Section title="Contact">
        <Input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          onBlur={() => void saveContact()}
          maxLength={200}
          placeholder="Phone, Telegram, Instagram, email…"
          className="text-sm"
        />
      </Section>

      <Section title="Location">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onBlur={() => void saveLocation()}
          maxLength={200}
          placeholder="City, neighborhood, meeting spot…"
          className="text-sm"
        />
      </Section>

      <Section title="I'm giving" count={trade.give.length}>
        <textarea
          value={giveText}
          onChange={(e) => setGiveText(e.target.value)}
          onBlur={() => void saveCodes('give', giveText)}
          placeholder="POR-5, GER-12, ARG-9 …"
          rows={3}
          className="block w-full rounded-md border border-neutral-200 p-2.5 font-mono text-sm"
        />
        {trade.give.length > 0 && (() => {
          const annotated = trade.give.map((code) => {
            const [teamCode, numStr] = code.split('-')
            const team = TEAM_BY_CODE.get(teamCode)
            const num = parseInt(numStr, 10)
            const sticker = stickers.get(code)
            const userName = sticker?.name ?? null
            const album = albumPlayerName(code)
            const name = userName ?? album ?? resolvePlayerLabel(code, null) ?? code
            return {
              code,
              teamName: team?.name ?? teamCode,
              num,
              name,
              count: sticker?.count ?? 0,
            }
          })
          const noSpares = annotated.filter((r) => r.count <= 1)
          const available = annotated.filter((r) => r.count >= 2)
          return (
            <>
              {noSpares.length > 0 && (
                <AnnotatedTable
                  title={`Don't have spares — ${noSpares.length} (possible mistake)`}
                  tone="rose"
                  rows={noSpares}
                  showCount
                  onRemove={(code) => void removeCode('give', code)}
                />
              )}
              {available.length > 0 && (
                <AnnotatedTable
                  title={`Available — ${available.length}`}
                  tone="emerald"
                  rows={available}
                  showCount
                  onRemove={(code) => void removeCode('give', code)}
                />
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
                <span>
                  Listed <strong>{trade.give.length}</strong>
                </span>
                <span className="text-emerald-700">
                  · <strong>{available.length}</strong> available
                </span>
                <span className="text-rose-700">
                  · <strong>{noSpares.length}</strong> don't have spares
                </span>
              </div>
            </>
          )
        })()}
      </Section>

      <Section title="I'm getting" count={trade.get.length}>
        <textarea
          value={getText}
          onChange={(e) => setGetText(e.target.value)}
          onBlur={() => void saveCodes('get', getText)}
          placeholder="POR-5, GER-12, ARG-9 …"
          rows={3}
          className="block w-full rounded-md border border-neutral-200 p-2.5 font-mono text-sm"
        />
        {(() => {
          if (trade.get.length === 0) return null
          const getOverlaps = findGetOverlaps(trade.id, trade.get, allTrades.values())
          if (getOverlaps.length === 0) return null
          return (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              <div className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Already coming via other locked trades:
              </div>
              <ul className="mt-1 space-y-0.5">
                {getOverlaps.map((o) => (
                  <li key={`${o.code}-${o.otherTrade.id}`}>
                    <strong className="font-mono">{o.code}</strong> in{' '}
                    <Link
                      to={`/trading/${o.otherTrade.id}`}
                      className="underline hover:text-amber-950"
                    >
                      {o.otherTrade.subject}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-1 italic">
                You'd end up with duplicates — swap for something else you're missing.
              </p>
            </div>
          )
        })()}
        {trade.get.length > 0 && (() => {
          const annotated = trade.get.map((code) => {
            const [teamCode, numStr] = code.split('-')
            const team = TEAM_BY_CODE.get(teamCode)
            const num = parseInt(numStr, 10)
            const sticker = stickers.get(code)
            const userName = sticker?.name ?? null
            const album = albumPlayerName(code)
            const name = userName ?? album ?? resolvePlayerLabel(code, null) ?? code
            return {
              code,
              teamName: team?.name ?? teamCode,
              num,
              name,
              count: sticker?.count ?? 0,
            }
          })
          const alreadyHave = annotated.filter((r) => r.count > 0)
          const newOnes = annotated.filter((r) => r.count === 0)
          return (
            <>
              {alreadyHave.length > 0 && (
                <AnnotatedTable
                  title={`Already in collection — ${alreadyHave.length} (possible mistake)`}
                  tone="amber"
                  rows={alreadyHave}
                  showCount
                  onRemove={(code) => void removeCode('get', code)}
                />
              )}
              {newOnes.length > 0 && (
                <AnnotatedTable
                  title={`New — ${newOnes.length}`}
                  tone="emerald"
                  rows={newOnes}
                  onRemove={(code) => void removeCode('get', code)}
                />
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
                <span>
                  Offered <strong>{trade.get.length}</strong>
                </span>
                <span className="text-emerald-700">
                  · <strong>{newOnes.length}</strong> new
                </span>
                <span className="text-amber-700">
                  · <strong>{alreadyHave.length}</strong> already have
                </span>
              </div>
            </>
          )
        })()}
      </Section>

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void saveNotes()}
          placeholder="Where to meet, what was agreed, contact info…"
          rows={4}
          className="block w-full rounded-md border border-neutral-200 p-2.5 text-sm"
        />
      </Section>

      <div className="mt-2 px-4">
        <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
          You are getting <strong className="text-emerald-700">{trade.get.length}</strong> sticker
          {trade.get.length === 1 ? '' : 's'} and giving away{' '}
          <strong className="text-rose-700">{trade.give.length}</strong> sticker
          {trade.give.length === 1 ? '' : 's'}.
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 px-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCsv}
          disabled={trade.give.length === 0 && trade.get.length === 0}
        >
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
        <Button type="button" variant="ghost" onClick={() => void handleDelete()} className="text-rose-600 ml-auto">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  )
}

function LockSection({
  trade,
  allTrades,
  stickers,
  onToggle,
}: {
  trade: ReturnType<typeof useTrade>
  allTrades: ReturnType<typeof useTrades>
  stickers: ReturnType<typeof useStickersMap>
  onToggle: () => void
}) {
  const overlaps = useMemo(() => {
    if (!trade) return []
    if (trade.locked) return []
    return findGiveOverlaps(trade.id, trade.give, allTrades.values(), stickers)
  }, [trade, allTrades, stickers])

  if (!trade) return null

  const isPending = trade.status === 'pending'
  const blocked = overlaps.length > 0

  return (
    <div className="mt-3 px-4">
      <div
        className={cn(
          'rounded-md border px-3 py-2.5',
          trade.locked
            ? 'border-amber-200 bg-amber-50'
            : 'border-neutral-200 bg-white',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
              {trade.locked ? (
                <Lock className="h-3.5 w-3.5 text-amber-600" />
              ) : (
                <Unlock className="h-3.5 w-3.5 text-neutral-400" />
              )}
              Lock cards
            </h3>
            <p className="mt-0.5 text-[11px] text-neutral-600">
              {trade.locked
                ? 'These codes are reserved across your missing, spares, and the public swap page until the trade closes.'
                : isPending
                  ? 'Reserve these codes so visitors can’t request them and other trades can’t double-promise them.'
                  : 'Lock only applies while the trade is Pending.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            disabled={!isPending || (!trade.locked && blocked)}
            className={cn(
              'h-8 shrink-0 rounded-full px-3 text-xs font-semibold',
              trade.locked
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : !isPending || blocked
                  ? 'cursor-not-allowed bg-neutral-200 text-neutral-400'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800',
            )}
          >
            {trade.locked ? 'Unlock' : 'Lock'}
          </button>
        </div>
        {!trade.locked && blocked && (
          <div className="mt-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
            <div className="font-semibold">
              Can&rsquo;t lock — these codes are already locked in another trade:
            </div>
            <ul className="mt-1 space-y-0.5">
              {overlaps.map((o) => (
                <li key={`${o.code}-${o.otherTrade.id}`}>
                  <strong className="font-mono">{o.code}</strong> in{' '}
                  <Link
                    to={`/trading/${o.otherTrade.id}`}
                    className="underline hover:text-rose-900"
                  >
                    {o.otherTrade.subject}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-1 italic">
              Remove these from one side or unlock the other trade first.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="mt-5 px-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-900">
        {title}
        {typeof count === 'number' && (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  )
}

type Row = { code: string; teamName: string; num: number; name: string }

function buildRows(codes: string[], stickers: Map<string, { name: string | null }>): Row[] {
  return codes.map((code) => {
    const [teamCode, numStr] = code.split('-')
    const team = TEAM_BY_CODE.get(teamCode)
    const num = parseInt(numStr, 10)
    const userName = stickers.get(code)?.name ?? null
    const album = albumPlayerName(code)
    const name = userName ?? album ?? resolvePlayerLabel(code, null) ?? code
    return { code, teamName: team?.name ?? teamCode, num, name }
  })
}

function RemoveButton({
  code,
  onRemove,
}: {
  code: string
  onRemove: (code: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onRemove(code)}
      aria-label={`Remove ${code}`}
      className="shrink-0 rounded-full p-1 text-neutral-300 hover:bg-neutral-100 hover:text-rose-600"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )
}

type AnnotatedRow = Row & { count: number }

function AnnotatedTable({
  title,
  tone,
  rows,
  showCount,
  onRemove,
}: {
  title: string
  tone: 'emerald' | 'amber' | 'rose'
  rows: AnnotatedRow[]
  showCount?: boolean
  onRemove?: (code: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const headerCls =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : tone === 'rose'
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
  const buttonHoverCls =
    tone === 'amber'
      ? 'hover:bg-amber-100 active:bg-amber-200'
      : tone === 'rose'
        ? 'hover:bg-rose-100 active:bg-rose-200'
        : 'hover:bg-emerald-100 active:bg-emerald-200'
  const iconCls =
    tone === 'amber'
      ? 'text-amber-600'
      : tone === 'rose'
        ? 'text-rose-600'
        : 'text-emerald-600'

  async function handleCopy() {
    try {
      const text = formatGroupedCodes(rows.map((r) => r.code))
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b px-3 py-1.5 text-[11px] font-semibold',
          headerCls,
        )}
      >
        <span className="min-w-0 truncate">{title}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
            buttonHoverCls,
          )}
          aria-label="Copy list"
        >
          {copied ? (
            <>
              <ClipboardCheck className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <ul>
        {rows.map((r, idx) => (
          <li
            key={`${r.code}-${idx}`}
            className={idx !== rows.length - 1 ? 'border-b border-neutral-100' : undefined}
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <Check className={cn('h-3.5 w-3.5 shrink-0', iconCls)} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-mono font-semibold text-neutral-900">
                  {r.code}
                </div>
                <div className="truncate text-[11px] text-neutral-600">
                  {r.name} · {r.teamName}
                </div>
              </div>
              {showCount && (
                <span
                  className={cn(
                    'inline-flex h-6 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-bold',
                    r.count >= 2
                      ? 'bg-amber-500 text-white'
                      : r.count === 1
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-500',
                  )}
                >
                  {r.count >= 2 ? `x${r.count}` : r.count}
                </span>
              )}
              {onRemove && <RemoveButton code={r.code} onRemove={onRemove} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function slug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned.length > 0 ? cleaned : 'trade'
}
