import type { Timestamp } from 'firebase/firestore'

export type TradeRequest = { code: string; qty: number }

export type Trade = {
  offered: string[]
  requested: TradeRequest[]
}

export type ProposalStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'completed'
  | 'cancelled'

export type Proposal = {
  id: string
  status: ProposalStatus
  trades: Trade[]
  proposer: { name: string; contact: string }
  proposerNote: string | null
  ownerNote: string | null
  createdAt: Timestamp | null
  decidedAt: Timestamp | null
  closedAt: Timestamp | null
  decidedBy: string | null
}

export type TradeValidation =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'offered_empty'
        | 'requested_empty'
        | 'offered_duplicate'
        | 'requested_qty_invalid'
        | 'requested_over_cap'
        | 'shape_invalid'
    }

export type ProposalValidation =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'no_trades'
        | 'too_many_trades'
        | 'name_empty'
        | 'contact_empty'
        | 'offered_duplicate_across_trades'
        | 'trade_invalid'
    }

export const REQUESTED_CAP = 5
export const OFFERED_SANITY_CAP = 50
export const TRADES_PER_PROPOSAL_CAP = 20

export function sumQty(requested: TradeRequest[]): number {
  return requested.reduce((acc, r) => acc + r.qty, 0)
}

export function validateTrade(trade: Trade): TradeValidation {
  if (trade.offered.length === 0) return { ok: false, reason: 'offered_empty' }
  const seen = new Set<string>()
  for (const code of trade.offered) {
    if (seen.has(code)) return { ok: false, reason: 'offered_duplicate' }
    seen.add(code)
  }
  if (trade.requested.length === 0) return { ok: false, reason: 'requested_empty' }
  for (const r of trade.requested) {
    if (!Number.isInteger(r.qty) || r.qty < 1) {
      return { ok: false, reason: 'requested_qty_invalid' }
    }
  }
  const totalRequested = sumQty(trade.requested)

  if (trade.offered.length === 1) {
    if (totalRequested > REQUESTED_CAP) {
      return { ok: false, reason: 'requested_over_cap' }
    }
    return { ok: true }
  }
  if (totalRequested === 1) {
    if (trade.offered.length > OFFERED_SANITY_CAP) {
      return { ok: false, reason: 'shape_invalid' }
    }
    return { ok: true }
  }
  return { ok: false, reason: 'shape_invalid' }
}

export type ProposalDraft = {
  trades: Trade[]
  proposer: { name: string; contact: string }
  proposerNote?: string | null
}

export function validateProposalDraft(draft: ProposalDraft): ProposalValidation {
  if (draft.trades.length === 0) return { ok: false, reason: 'no_trades' }
  if (draft.trades.length > TRADES_PER_PROPOSAL_CAP) {
    return { ok: false, reason: 'too_many_trades' }
  }
  if (draft.proposer.name.trim().length === 0) return { ok: false, reason: 'name_empty' }
  if (draft.proposer.contact.trim().length === 0) {
    return { ok: false, reason: 'contact_empty' }
  }
  const seenOffered = new Set<string>()
  for (const trade of draft.trades) {
    const tv = validateTrade(trade)
    if (!tv.ok) return { ok: false, reason: 'trade_invalid' }
    for (const code of trade.offered) {
      if (seenOffered.has(code)) {
        return { ok: false, reason: 'offered_duplicate_across_trades' }
      }
      seenOffered.add(code)
    }
  }
  return { ok: true }
}
