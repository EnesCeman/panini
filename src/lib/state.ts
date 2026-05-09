import {
  collection,
  doc,
  increment as fsIncrement,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { TEAMS } from '@/data/teams'
import { db } from './firebase'

export type Sticker = { count: number; name: string | null }
export type Toast = { id: number; message: string }

export const EMPTY_STICKER: Sticker = { count: 0, name: null }

type State = {
  stickers: Map<string, Sticker>
  ready: boolean
  toasts: Toast[]
}

type Actions = {
  setStickers: (m: Map<string, Sticker>) => void
  patchSticker: (code: string, s: Sticker) => void
  pushToast: (message: string) => void
  dismissToast: (id: number) => void
}

let toastId = 1

export const useStore = create<State & Actions>((set, get) => ({
  stickers: new Map(),
  ready: false,
  toasts: [],
  setStickers: (stickers) => set({ stickers, ready: true }),
  patchSticker: (code, sticker) =>
    set((state) => {
      const next = new Map(state.stickers)
      next.set(code, sticker)
      return { stickers: next }
    }),
  pushToast: (message) => {
    const id = toastId++
    set((state) => ({ toasts: [...state.toasts, { id, message }] }))
    setTimeout(() => get().dismissToast(id), 3500)
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export function subscribeStickers(): () => void {
  return onSnapshot(
    collection(db, 'stickers'),
    (snap) => {
      const map = new Map<string, Sticker>()
      snap.forEach((d) => {
        const data = d.data() as { count?: number; name?: string | null }
        const count = typeof data.count === 'number' && data.count > 0 ? data.count : 0
        map.set(d.id, { count, name: data.name ?? null })
      })
      useStore.getState().setStickers(map)
    },
    (err) => {
      console.error('Firestore snapshot error', err)
      useStore.getState().pushToast('Connection error')
    },
  )
}

export function useStickersMap(): Map<string, Sticker> {
  return useStore((s) => s.stickers)
}

export function useSticker(code: string): Sticker {
  return useStore((s) => s.stickers.get(code) ?? EMPTY_STICKER)
}

export function useTotals() {
  return useStore(
    useShallow((s) => {
      let have = 0
      let doubles = 0
      for (const sticker of s.stickers.values()) {
        if (sticker.count >= 1) have += 1
        if (sticker.count >= 2) doubles += sticker.count - 1
      }
      const total = TEAMS.length * 20
      return { have, doubles, total, missing: total - have }
    }),
  )
}

export function useTeamProgress(teamCode: string) {
  return useStore(
    useShallow((s) => {
      let have = 0
      for (let i = 1; i <= 20; i++) {
        const sticker = s.stickers.get(`${teamCode}-${i}`)
        if (sticker && sticker.count >= 1) have += 1
      }
      return { have, total: 20 }
    }),
  )
}

export function useToasts() {
  return useStore((s) => s.toasts)
}

export async function incrementSticker(code: string) {
  const before = useStore.getState().stickers.get(code) ?? EMPTY_STICKER
  useStore.getState().patchSticker(code, { ...before, count: before.count + 1 })
  try {
    await setDoc(
      doc(db, 'stickers', code),
      { count: fsIncrement(1), updatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (e) {
    useStore.getState().patchSticker(code, before)
    useStore.getState().pushToast('Failed to update')
    console.error(e)
  }
}

export async function decrementSticker(code: string) {
  const before = useStore.getState().stickers.get(code) ?? EMPTY_STICKER
  if (before.count <= 0) return
  useStore.getState().patchSticker(code, { ...before, count: before.count - 1 })
  try {
    await setDoc(
      doc(db, 'stickers', code),
      { count: fsIncrement(-1), updatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (e) {
    useStore.getState().patchSticker(code, before)
    useStore.getState().pushToast('Failed to update')
    console.error(e)
  }
}

export async function setStickerName(code: string, name: string) {
  const before = useStore.getState().stickers.get(code) ?? EMPTY_STICKER
  const trimmed = name.trim()
  const nextName = trimmed.length > 0 ? trimmed : null
  if (nextName === before.name) return
  useStore.getState().patchSticker(code, { ...before, name: nextName })
  try {
    await setDoc(
      doc(db, 'stickers', code),
      { name: nextName, updatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (e) {
    useStore.getState().patchSticker(code, before)
    useStore.getState().pushToast('Failed to save name')
    console.error(e)
  }
}

export async function incrementMany(codes: string[]): Promise<void> {
  if (codes.length === 0) return
  const state = useStore.getState()
  const before = new Map<string, Sticker>()
  for (const code of codes) {
    const prev = state.stickers.get(code) ?? EMPTY_STICKER
    before.set(code, prev)
    state.patchSticker(code, { ...prev, count: prev.count + 1 })
  }
  const results = await Promise.allSettled(
    codes.map((code) =>
      setDoc(
        doc(db, 'stickers', code),
        { count: fsIncrement(1), updatedAt: serverTimestamp() },
        { merge: true },
      ),
    ),
  )
  let failures = 0
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      failures += 1
      const code = codes[i]
      const prev = before.get(code)
      if (prev) useStore.getState().patchSticker(code, prev)
      console.error('incrementMany failed for', code, r.reason)
    }
  })
  if (failures > 0) {
    useStore.getState().pushToast(
      failures === 1 ? '1 update failed' : `${failures} updates failed`,
    )
  }
}
