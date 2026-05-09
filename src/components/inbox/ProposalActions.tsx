import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  acceptProposal,
  cancelProposal,
  completeProposal,
  rejectProposal,
} from '@/lib/proposals'
import type { Proposal } from '@/lib/proposalSchema'

type Props = { proposal: Proposal }

export function ProposalActions({ proposal }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'accept' | 'reject' | null>(null)
  const [note, setNote] = useState('')

  async function run(action: () => Promise<void>, label: string) {
    setBusy(label)
    try {
      await action()
    } catch (e) {
      console.error(e)
      alert(`Failed: ${label}`)
    } finally {
      setBusy(null)
      setConfirming(null)
      setNote('')
    }
  }

  if (proposal.status === 'pending') {
    if (confirming) {
      return (
        <div className="flex flex-col gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Optional note for ${confirming}…`}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                run(
                  () =>
                    confirming === 'accept'
                      ? acceptProposal(proposal.id, note || null)
                      : rejectProposal(proposal.id, note || null),
                  confirming,
                )
              }
            >
              {busy ? 'Saving…' : `Confirm ${confirming}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirming(null)
                setNote('')
              }}
            >
              Back
            </Button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex gap-2">
        <Button type="button" onClick={() => setConfirming('accept')}>
          Accept
        </Button>
        <Button type="button" variant="outline" onClick={() => setConfirming('reject')}>
          Reject
        </Button>
      </div>
    )
  }

  if (proposal.status === 'accepted') {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy !== null}
          onClick={() => run(() => completeProposal(proposal.id), 'complete')}
        >
          {busy === 'complete' ? 'Saving…' : 'Mark completed'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => run(() => cancelProposal(proposal.id), 'cancel')}
        >
          {busy === 'cancel' ? 'Saving…' : 'Cancel swap'}
        </Button>
      </div>
    )
  }

  return null
}
