import { describe, expect, it } from 'vitest'
import { deriveReservations } from '@/lib/reservations'
import type { Proposal } from '@/lib/proposalSchema'

function makeProposal(
  id: string,
  status: Proposal['status'],
  trades: Proposal['trades'],
): Proposal {
  return {
    id,
    status,
    trades,
    proposer: { name: 'x', contact: 'y' },
    proposerNote: null,
    ownerNote: null,
    createdAt: null,
    decidedAt: null,
    closedAt: null,
    decidedBy: null,
  }
}

describe('deriveReservations', () => {
  it('returns empty maps when there are no accepted proposals', () => {
    const r = deriveReservations([])
    expect(r.incoming.size).toBe(0)
    expect(r.outgoing.size).toBe(0)
  })

  it('ignores non-accepted proposals', () => {
    const p = makeProposal('a', 'pending', [
      { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 2 }] },
    ])
    const r = deriveReservations([p])
    expect(r.incoming.get('POR-5') ?? 0).toBe(0)
    expect(r.outgoing.get('BRA-1') ?? 0).toBe(0)
  })

  it('counts incoming from accepted proposals', () => {
    const p = makeProposal('a', 'accepted', [
      { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] },
    ])
    const r = deriveReservations([p])
    expect(r.incoming.get('POR-5')).toBe(1)
  })

  it('counts incoming for each offered code in a multi-offered trade', () => {
    const p = makeProposal('a', 'accepted', [
      { offered: ['POR-5', 'ENG-3'], requested: [{ code: 'BRA-1', qty: 1 }] },
    ])
    const r = deriveReservations([p])
    expect(r.incoming.get('POR-5')).toBe(1)
    expect(r.incoming.get('ENG-3')).toBe(1)
  })

  it('sums outgoing qty across trades and proposals', () => {
    const p1 = makeProposal('a', 'accepted', [
      { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 2 }] },
    ])
    const p2 = makeProposal('b', 'accepted', [
      {
        offered: ['ENG-3'],
        requested: [
          { code: 'BRA-1', qty: 1 },
          { code: 'GER-2', qty: 1 },
        ],
      },
    ])
    const r = deriveReservations([p1, p2])
    expect(r.outgoing.get('BRA-1')).toBe(3)
    expect(r.outgoing.get('GER-2')).toBe(1)
  })

  it('does not count completed/cancelled/rejected/withdrawn proposals', () => {
    const trades = [{ offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] }]
    const r = deriveReservations([
      makeProposal('a', 'completed', trades),
      makeProposal('b', 'cancelled', trades),
      makeProposal('c', 'rejected', trades),
      makeProposal('d', 'withdrawn', trades),
    ])
    expect(r.incoming.size).toBe(0)
    expect(r.outgoing.size).toBe(0)
  })
})
