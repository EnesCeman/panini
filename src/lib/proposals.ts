import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { auth, db } from './firebase'
import {
  validateProposalDraft,
  type Proposal,
  type ProposalDraft,
} from './proposalSchema'

const ID_LENGTH = 12

export async function createProposal(draft: ProposalDraft): Promise<string> {
  const v = validateProposalDraft(draft)
  if (!v.ok) throw new Error(`Invalid proposal: ${v.reason}`)

  const id = nanoid(ID_LENGTH)
  await setDoc(doc(db, 'proposals', id), {
    status: 'pending',
    trades: draft.trades,
    proposer: {
      name: draft.proposer.name.trim(),
      contact: draft.proposer.contact.trim(),
    },
    proposerNote:
      draft.proposerNote && draft.proposerNote.trim().length > 0
        ? draft.proposerNote.trim()
        : null,
    ownerNote: null,
    createdAt: serverTimestamp(),
    decidedAt: null,
    closedAt: null,
    decidedBy: null,
  })
  return id
}

export async function withdrawProposal(id: string): Promise<void> {
  await updateDoc(doc(db, 'proposals', id), {
    status: 'withdrawn',
    closedAt: serverTimestamp(),
  })
}

export async function acceptProposal(
  id: string,
  ownerNote: string | null,
): Promise<void> {
  const uid = requireAdminUid()
  await updateDoc(doc(db, 'proposals', id), {
    status: 'accepted',
    decidedAt: serverTimestamp(),
    decidedBy: uid,
    ownerNote: ownerNote && ownerNote.length > 0 ? ownerNote : null,
  })
}

export async function rejectProposal(
  id: string,
  ownerNote: string | null,
): Promise<void> {
  const uid = requireAdminUid()
  await updateDoc(doc(db, 'proposals', id), {
    status: 'rejected',
    decidedAt: serverTimestamp(),
    closedAt: serverTimestamp(),
    decidedBy: uid,
    ownerNote: ownerNote && ownerNote.length > 0 ? ownerNote : null,
  })
}

export async function completeProposal(id: string): Promise<void> {
  requireAdminUid()
  await updateDoc(doc(db, 'proposals', id), {
    status: 'completed',
    closedAt: serverTimestamp(),
  })
}

export async function cancelProposal(id: string): Promise<void> {
  requireAdminUid()
  await updateDoc(doc(db, 'proposals', id), {
    status: 'cancelled',
    closedAt: serverTimestamp(),
  })
}

export async function fetchProposalById(id: string): Promise<Proposal | null> {
  const snap = await getDoc(doc(db, 'proposals', id))
  if (!snap.exists()) return null
  const data = snap.data() as Omit<Proposal, 'id'>
  return { id: snap.id, ...data }
}

function requireAdminUid(): string {
  const u = auth.currentUser
  if (!u) throw new Error('Not signed in')
  return u.uid
}
