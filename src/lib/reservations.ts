import type { Proposal } from './proposalSchema'

export type ReservationMaps = {
  incoming: Map<string, number>
  outgoing: Map<string, number>
}

export function deriveReservations(proposals: Proposal[]): ReservationMaps {
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  for (const p of proposals) {
    if (p.status !== 'accepted') continue
    for (const trade of p.trades) {
      for (const code of trade.offered) {
        incoming.set(code, (incoming.get(code) ?? 0) + 1)
      }
      for (const r of trade.requested) {
        outgoing.set(r.code, (outgoing.get(r.code) ?? 0) + r.qty)
      }
    }
  }
  return { incoming, outgoing }
}

export function availableSpare(
  count: number,
  outgoingReserved: number,
): number {
  const spare = Math.max(0, count - 1)
  return Math.max(0, spare - outgoingReserved)
}
