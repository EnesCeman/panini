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
import { TEAMS } from '@/data/teams'
import { db } from './firebase'

const ALBUM_ORDER = new Map(TEAMS.map((t, i) => [t.code, i]))

function albumIndex(code: string): number {
  return ALBUM_ORDER.get(code) ?? Number.MAX_SAFE_INTEGER
}

export type Submission = {
  id: string
  name: string
  contact: string
  note: string
  theyHave: string[]
  theyWant: string[]
  handled: boolean
  locale: 'bs' | 'en'
  createdAt: Timestamp | null
}

export type SubmissionInput = {
  name: string
  contact: string
  note: string
  theyHave: string[]
  theyWant: string[]
  locale: 'bs' | 'en'
}

type State = {
  submissions: Map<string, Submission>
  ready: boolean
}

type Actions = {
  setSubmissions: (m: Map<string, Submission>) => void
}

export const useSubmissionsStore = create<State & Actions>((set) => ({
  submissions: new Map(),
  ready: false,
  setSubmissions: (submissions) => set({ submissions, ready: true }),
}))

export function subscribeSubmissions(): () => void {
  return onSnapshot(
    collection(db, 'submissions'),
    (snap) => {
      const map = new Map<string, Submission>()
      snap.forEach((d) => {
        const data = d.data() as Omit<Submission, 'id'>
        map.set(d.id, { id: d.id, ...data })
      })
      useSubmissionsStore.getState().setSubmissions(map)
    },
    (err) => {
      console.error('Submissions snapshot error', err)
    },
  )
}

export function useSubmissions(): Map<string, Submission> {
  return useSubmissionsStore((s) => s.submissions)
}

export function usePendingSubmissionsCount(): number {
  return useSubmissionsStore((s) => {
    let n = 0
    for (const sub of s.submissions.values()) if (!sub.handled) n += 1
    return n
  })
}

export async function submitRequest(input: SubmissionInput): Promise<string> {
  const ref = await addDoc(collection(db, 'submissions'), {
    name: input.name.trim(),
    contact: input.contact.trim(),
    note: input.note.trim(),
    theyHave: input.theyHave,
    theyWant: input.theyWant,
    handled: false,
    locale: input.locale,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function markSubmissionHandled(id: string, handled: boolean): Promise<void> {
  await updateDoc(doc(db, 'submissions', id), { handled })
}

export async function deleteSubmission(id: string): Promise<void> {
  await deleteDoc(doc(db, 'submissions', id))
}

export function groupCodesByTeam(codes: string[]): Map<string, number[]> {
  const out = new Map<string, number[]>()
  for (const code of codes) {
    const [team, numStr] = code.split('-')
    const num = parseInt(numStr, 10)
    if (!team || Number.isNaN(num)) continue
    const list = out.get(team) ?? []
    list.push(num)
    out.set(team, list)
  }
  for (const list of out.values()) list.sort((a, b) => a - b)
  return out
}

export function formatGroupedCodes(
  codes: string[],
  order: 'alpha' | 'album' = 'alpha',
): string {
  const groups = groupCodesByTeam(codes)
  const teams = Array.from(groups.keys()).sort((a, b) =>
    order === 'album' ? albumIndex(a) - albumIndex(b) : a.localeCompare(b),
  )
  return teams.map((t) => `${t} ${groups.get(t)!.join(',')}`).join('\n')
}
