import { ArrowLeft, Check, Download, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TEAMS } from '@/data/teams'
import { parseCodes } from '@/lib/parseCodes'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { formatGroupedCodes } from '@/lib/submissions'
import {
  deleteTrade,
  subscribeTrades,
  updateTrade,
  useTrade,
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
  const stickers = useStickersMap()
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = subscribeTrades()
    return () => unsub()
  }, [])

  const [subject, setSubject] = useState('')
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

  const giveRows = buildRows(trade.give, stickers)

  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <Link
          to="/trading"
          className="rounded-full p-1.5 text-neutral-600 hover:bg-neutral-200"
          aria-label="Back to Trading"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
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

      <Section title="I'm giving" count={trade.give.length}>
        <textarea
          value={giveText}
          onChange={(e) => setGiveText(e.target.value)}
          onBlur={() => void saveCodes('give', giveText)}
          placeholder="POR-5, GER-12, ARG-9 …"
          rows={3}
          className="block w-full rounded-md border border-neutral-200 p-2.5 font-mono text-sm"
        />
        {giveRows.length > 0 && <RowTable rows={giveRows} tone="rose" />}
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
                />
              )}
              {newOnes.length > 0 && (
                <AnnotatedTable
                  title={`New — ${newOnes.length}`}
                  tone="emerald"
                  rows={newOnes}
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

function RowTable({ rows, tone }: { rows: Row[]; tone: 'emerald' | 'rose' }) {
  return (
    <ul className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {rows.map((r, idx) => (
        <li
          key={`${r.code}-${idx}`}
          className={idx !== rows.length - 1 ? 'border-b border-neutral-100' : undefined}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <Check
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                tone === 'emerald' ? 'text-emerald-600' : 'text-rose-600',
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-mono font-semibold text-neutral-900">
                {r.code}
              </div>
              <div className="truncate text-[11px] text-neutral-600">
                {r.name} · {r.teamName}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

type AnnotatedRow = Row & { count: number }

function AnnotatedTable({
  title,
  tone,
  rows,
  showCount,
}: {
  title: string
  tone: 'emerald' | 'amber'
  rows: AnnotatedRow[]
  showCount?: boolean
}) {
  const headerCls =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
  const iconCls = tone === 'amber' ? 'text-amber-600' : 'text-emerald-600'
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className={cn('border-b px-3 py-1.5 text-[11px] font-semibold', headerCls)}>
        {title}
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
              {showCount && r.count > 0 && (
                <span
                  className={cn(
                    'inline-flex h-6 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-bold',
                    r.count >= 2
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white',
                  )}
                >
                  {r.count >= 2 ? `x${r.count}` : '1'}
                </span>
              )}
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
