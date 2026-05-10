import { ChevronRight, ClipboardCheck, Copy, Lock, MapPin, Phone, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { createTrade, subscribeTrades, useTrades, type Trade, type TradeStatus } from '@/lib/trades'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<TradeStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  cancelled: "Didn't happen",
}

const FILTER_ORDER: TradeStatus[] = ['pending', 'completed', 'cancelled']

export function Trading() {
  const trades = useTrades()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterParam = searchParams.get('filter')
  const filter: TradeStatus =
    filterParam === 'completed' || filterParam === 'cancelled' ? filterParam : 'pending'
  function setFilter(next: TradeStatus) {
    if (next === 'pending') setSearchParams({}, { replace: true })
    else setSearchParams({ filter: next }, { replace: true })
  }
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = subscribeTrades()
    return () => unsub()
  }, [])

  const counts = useMemo(() => {
    const c: Record<TradeStatus, number> = { pending: 0, completed: 0, cancelled: 0 }
    for (const t of trades.values()) c[t.status] += 1
    return c
  }, [trades])

  const filtered = useMemo(() => {
    return Array.from(trades.values())
      .filter((t) => t.status === filter)
      .sort((a, b) => {
        const ta = a.updatedAt?.toMillis() ?? 0
        const tb = b.updatedAt?.toMillis() ?? 0
        return tb - ta
      })
  }, [trades, filter])

  async function handleCreate() {
    setCreating(true)
    try {
      const id = await createTrade()
      navigate(`/trading/${id}`)
    } catch (e) {
      console.error(e)
      setCreating(false)
    }
  }

  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-neutral-900">Trading</h1>
          <Button type="button" size="sm" onClick={() => void handleCreate()} disabled={creating}>
            <Plus className="h-4 w-4" />
            New trade
          </Button>
        </div>
        <div className="flex gap-2">
          {FILTER_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                filter === s
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-700 ring-1 ring-neutral-200',
              )}
            >
              {STATUS_LABEL[s]}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[s]}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-2 px-4 pt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            {filter === 'pending' ? 'No pending trades. Tap “New trade” to start one.' : 'Nothing here.'}
          </p>
        ) : (
          filtered.map((t) => <TradeRow key={t.id} trade={t} />)
        )}
      </div>
    </div>
  )
}

function TradeRow({ trade }: { trade: Trade }) {
  const [copiedField, setCopiedField] = useState<'contact' | 'location' | null>(null)
  const updated = trade.updatedAt ? formatRelative(trade.updatedAt.toMillis()) : '—'

  function handleCopy(field: 'contact' | 'location', value: string) {
    return async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!value) return
      try {
        await navigator.clipboard.writeText(value)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 1200)
      } catch (err) {
        console.error(err)
      }
    }
  }

  return (
    <Link
      to={`/trading/${trade.id}`}
      className="flex items-center gap-3 overflow-hidden rounded-lg border border-neutral-200 bg-white px-3 py-2.5 active:bg-neutral-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {trade.locked && trade.status === 'pending' && (
            <Lock className="h-3 w-3 shrink-0 text-amber-600" aria-label="Locked" />
          )}
          <div
            className={cn(
              'truncate text-sm font-semibold',
              trade.subject.length > 0 ? 'text-neutral-900' : 'text-neutral-400',
            )}
          >
            {trade.subject.length > 0 ? trade.subject : 'Untitled trade'}
          </div>
        </div>
        {trade.contact.length > 0 && (
          <CopyableField
            icon={<Phone className="h-3 w-3 shrink-0" />}
            value={trade.contact}
            copied={copiedField === 'contact'}
            onClick={handleCopy('contact', trade.contact)}
          />
        )}
        {trade.location.length > 0 && (
          <CopyableField
            icon={<MapPin className="h-3 w-3 shrink-0" />}
            value={trade.location}
            copied={copiedField === 'location'}
            onClick={handleCopy('location', trade.location)}
          />
        )}
        <div className="truncate text-[11px] text-neutral-500">
          Giving {trade.give.length} · Getting {trade.get.length} · {updated}
        </div>
        {trade.notes.length > 0 && (
          <div className="truncate text-[10px] italic text-neutral-400">
            “{firstLine(trade.notes)}”
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
    </Link>
  )
}

function CopyableField({
  icon,
  value,
  copied,
  onClick,
}: {
  icon: React.ReactNode
  value: string
  copied: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex max-w-full items-center gap-1 text-left text-[11px] hover:text-emerald-700',
        copied ? 'text-emerald-700' : 'text-neutral-600',
      )}
      title="Click to copy"
    >
      {icon}
      <span className="truncate">{copied ? 'Copied!' : value}</span>
      {copied ? (
        <ClipboardCheck className="h-3 w-3 shrink-0" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 opacity-60" />
      )}
    </button>
  )
}

function firstLine(text: string): string {
  const idx = text.indexOf('\n')
  return idx === -1 ? text : text.slice(0, idx)
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 30) return `${d}d ago`
  const date = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}
