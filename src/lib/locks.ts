import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useMemo } from 'react'
import { create } from 'zustand'
import { db } from './firebase'
import type { Trade } from './trades'

export type LockedTradeRef = { id: string; subject: string }

export type AdminLocks = {
  outgoing: Map<string, LockedTradeRef[]>
  incoming: Map<string, LockedTradeRef[]>
}

export type PublicLocks = {
  outgoing: Map<string, number>
  incoming: Map<string, number>
}

const EMPTY_PUBLIC_LOCKS: PublicLocks = {
  outgoing: new Map(),
  incoming: new Map(),
}

// A trade only contributes to the lock state when it's both pending AND
// the user has explicitly toggled the lock on. Status leaving pending
// auto-releases the lock effect (the trade's `locked` flag stays as-is so
// flipping back to pending re-applies it).
function isActive(t: Trade): boolean {
  return t.locked && t.status === 'pending'
}

export function computeAdminLocks(trades: Iterable<Trade>): AdminLocks {
  const outgoing = new Map<string, LockedTradeRef[]>()
  const incoming = new Map<string, LockedTradeRef[]>()
  for (const t of trades) {
    if (!isActive(t)) continue
    const ref: LockedTradeRef = {
      id: t.id,
      subject: t.subject.trim().length > 0 ? t.subject : 'Untitled trade',
    }
    for (const code of t.give) {
      const list = outgoing.get(code) ?? []
      list.push(ref)
      outgoing.set(code, list)
    }
    for (const code of t.get) {
      const list = incoming.get(code) ?? []
      list.push(ref)
      incoming.set(code, list)
    }
  }
  return { outgoing, incoming }
}

export function useAdminLocks(trades: Map<string, Trade>): AdminLocks {
  return useMemo(() => computeAdminLocks(trades.values()), [trades])
}

// Find this trade's give-overlap against other locked-pending trades.
// A code is only flagged when locking this trade would push total
// commitments across active trades above the user's giveable supply.
// One copy is always reserved for the album, so giveable = max(0,
// count - 1). E.g. count=3 has 2 spares; one lock elsewhere still
// leaves room for another. count=2 has 1 spare; a single existing
// lock blocks any further locks.
export type GiveOverlap = { code: string; otherTrade: LockedTradeRef }

export function findGiveOverlaps(
  thisTradeId: string,
  thisGive: string[],
  trades: Iterable<Trade>,
  stickers: Map<string, { count: number }>,
): GiveOverlap[] {
  const otherCommits = new Map<string, LockedTradeRef[]>()
  for (const t of trades) {
    if (t.id === thisTradeId) continue
    if (!isActive(t)) continue
    const ref: LockedTradeRef = {
      id: t.id,
      subject: t.subject.trim().length > 0 ? t.subject : 'Untitled trade',
    }
    for (const code of t.give) {
      const list = otherCommits.get(code) ?? []
      list.push(ref)
      otherCommits.set(code, list)
    }
  }

  const overlaps: GiveOverlap[] = []
  for (const code of new Set(thisGive)) {
    const otherList = otherCommits.get(code) ?? []
    if (otherList.length === 0) continue
    const owned = stickers.get(code)?.count ?? 0
    const giveable = Math.max(0, owned - 1)
    if (otherList.length + 1 > giveable) {
      for (const ref of otherList) {
        overlaps.push({ code, otherTrade: ref })
      }
    }
  }
  return overlaps
}

// Find codes in this trade's get list that are already incoming via other
// locked-pending trades. Informational — doesn't block anything — so the
// user can swap the request for something they actually still need.
export type GetOverlap = { code: string; otherTrade: LockedTradeRef }

export function findGetOverlaps(
  thisTradeId: string,
  thisGet: string[],
  trades: Iterable<Trade>,
): GetOverlap[] {
  const overlaps: GetOverlap[] = []
  const thisGetSet = new Set(thisGet)
  for (const t of trades) {
    if (t.id === thisTradeId) continue
    if (!isActive(t)) continue
    const ref: LockedTradeRef = {
      id: t.id,
      subject: t.subject.trim().length > 0 ? t.subject : 'Untitled trade',
    }
    for (const code of t.get) {
      if (thisGetSet.has(code)) {
        overlaps.push({ code, otherTrade: ref })
      }
    }
  }
  return overlaps
}

// Public locks: derived snapshot in meta/locks. Admin client writes it
// whenever trades change; visitor client only reads.

type State = { locks: PublicLocks; ready: boolean }
type Actions = { setLocks: (l: PublicLocks) => void }

const usePublicLocksStore = create<State & Actions>((set) => ({
  locks: EMPTY_PUBLIC_LOCKS,
  ready: false,
  setLocks: (locks) => set({ locks, ready: true }),
}))

export function subscribePublicLocks(): () => void {
  return onSnapshot(
    doc(db, 'meta', 'locks'),
    (snap) => {
      const data = snap.data() as
        | { outgoing?: Record<string, number>; incoming?: Record<string, number> }
        | undefined
      const outgoing = new Map<string, number>()
      const incoming = new Map<string, number>()
      if (data?.outgoing) {
        for (const [code, n] of Object.entries(data.outgoing)) {
          if (typeof n === 'number' && n > 0) outgoing.set(code, n)
        }
      }
      if (data?.incoming) {
        for (const [code, n] of Object.entries(data.incoming)) {
          if (typeof n === 'number' && n > 0) incoming.set(code, n)
        }
      }
      usePublicLocksStore.getState().setLocks({ outgoing, incoming })
    },
    (err) => {
      console.error('Public locks snapshot error', err)
    },
  )
}

export function usePublicLocks(): PublicLocks {
  return usePublicLocksStore((s) => s.locks)
}

let lastSyncedKey = ''

// Recompute meta/locks from the current trades snapshot. Skips the write
// when the resulting payload hasn't changed, since useEffect will fire
// for any trade edit.
export async function syncLocksToFirestore(trades: Iterable<Trade>): Promise<void> {
  const outgoing: Record<string, number> = {}
  const incoming: Record<string, number> = {}
  for (const t of trades) {
    if (!isActive(t)) continue
    for (const code of t.give) outgoing[code] = (outgoing[code] ?? 0) + 1
    for (const code of t.get) incoming[code] = (incoming[code] ?? 0) + 1
  }
  const key = JSON.stringify({ outgoing, incoming })
  if (key === lastSyncedKey) return
  lastSyncedKey = key
  try {
    await setDoc(doc(db, 'meta', 'locks'), {
      outgoing,
      incoming,
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('syncLocksToFirestore failed', e)
    lastSyncedKey = ''
  }
}
