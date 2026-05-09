import { ChevronLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TradeRow } from '@/components/market/TradeRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  TRADES_PER_PROPOSAL_CAP,
  validateProposalDraft,
  type Trade,
} from '@/lib/proposalSchema'
import { createProposal } from '@/lib/proposals'

const EMPTY_TRADE: Trade = { offered: [], requested: [] }

export function NewProposal() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const offerParam = params.get('offer')
  const wantParam = params.get('want')
  const [trades, setTrades] = useState<Trade[]>(() => {
    if (offerParam) return [{ offered: [offerParam], requested: [] }]
    if (wantParam) return [{ offered: [], requested: [{ code: wantParam, qty: 1 }] }]
    return [{ ...EMPTY_TRADE }]
  })
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const draft = { trades, proposer: { name, contact }, proposerNote: note }
  const validation = validateProposalDraft(draft)

  async function handleSubmit() {
    setError(null)
    const v = validateProposalDraft(draft)
    if (!v.ok) {
      setError(`Cannot submit: ${v.reason.replace(/_/g, ' ')}`)
      return
    }
    setSubmitting(true)
    try {
      const id = await createProposal(draft)
      navigate(`/market/p/${id}?just=1`)
    } catch (e) {
      console.error(e)
      setError('Failed to submit. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-3 md:px-6">
      <Link
        to="/market"
        className="inline-flex items-center gap-1 self-start text-xs text-neutral-600 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to browse
      </Link>
      <div>
        <h1 className="text-base font-semibold text-neutral-900">New proposal</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Each trade: 1 you offer for up to 5 you want, OR many you offer for exactly 1 you want.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {trades.map((trade, idx) => (
          <TradeRow
            key={idx}
            trade={trade}
            index={idx}
            onChange={(next) =>
              setTrades(trades.map((t, i) => (i === idx ? next : t)))
            }
            onRemove={() => setTrades(trades.filter((_, i) => i !== idx))}
            removable={trades.length > 1}
            excludedOfferedAcrossProposal={
              new Set(
                trades
                  .filter((_, i) => i !== idx)
                  .flatMap((t) => t.offered),
              )
            }
          />
        ))}
      </div>

      {trades.length < TRADES_PER_PROPOSAL_CAP && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setTrades([...trades, { ...EMPTY_TRADE }])}
        >
          <Plus className="h-4 w-4" />
          Add another trade
        </Button>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Your details</h3>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-neutral-600">
              Your name
            </span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-neutral-600">
              Contact (email, phone, IG handle…)
            </span>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="me@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-neutral-600">
              Note (optional)
            </span>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., can ship from Lisbon"
            />
          </label>
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-rose-100 px-3 py-2 text-xs text-rose-800">{error}</p>
      )}

      <Button
        type="button"
        disabled={!validation.ok || submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? 'Submitting…' : 'Submit proposal'}
      </Button>

      <Link to="/market" className="text-center text-xs text-neutral-500">
        Cancel and go back
      </Link>
    </div>
  )
}
