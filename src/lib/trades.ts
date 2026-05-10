import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { create } from 'zustand'
import { db } from './firebase'

export type TradeStatus = 'pending' | 'completed' | 'cancelled'

export type Trade = {
  id: string
  subject: string
  give: string[]
  get: string[]
  notes: string
  status: TradeStatus
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

type State = {
  trades: Map<string, Trade>
  ready: boolean
}

type Actions = {
  setTrades: (m: Map<string, Trade>) => void
}

export const useTradesStore = create<State & Actions>((set) => ({
  trades: new Map(),
  ready: false,
  setTrades: (trades) => set({ trades, ready: true }),
}))

export function subscribeTrades(): () => void {
  return onSnapshot(
    collection(db, 'trades'),
    (snap) => {
      const map = new Map<string, Trade>()
      snap.forEach((d) => {
        const data = d.data() as Partial<Trade> & { name?: string }
        map.set(d.id, {
          id: d.id,
          // Older trades persisted only `name`; treat it as the subject if no
          // explicit subject has been written yet.
          subject: data.subject ?? data.name ?? '',
          give: data.give ?? [],
          get: data.get ?? [],
          notes: data.notes ?? '',
          status: data.status ?? 'pending',
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        })
      })
      useTradesStore.getState().setTrades(map)
    },
    (err) => {
      console.error('Trades snapshot error', err)
    },
  )
}

export function useTrades(): Map<string, Trade> {
  return useTradesStore((s) => s.trades)
}

export function useTrade(id: string | undefined): Trade | undefined {
  return useTradesStore((s) => (id ? s.trades.get(id) : undefined))
}

export async function createTrade(): Promise<string> {
  const ref = await addDoc(collection(db, 'trades'), {
    subject: '',
    give: [],
    get: [],
    notes: '',
    status: 'pending' as TradeStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

type TradePatch = Partial<Pick<Trade, 'subject' | 'give' | 'get' | 'notes' | 'status'>>

export async function updateTrade(id: string, patch: TradePatch): Promise<void> {
  await updateDoc(doc(db, 'trades', id), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTrade(id: string): Promise<void> {
  await deleteDoc(doc(db, 'trades', id))
}
