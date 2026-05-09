import { useMemo, useState } from 'react'
import { AuthGate } from '@/components/AuthGate'
import { SignInButton } from '@/components/SignInButton'
import type { Proposal } from '@/lib/proposalSchema'
import { useProposals } from '@/lib/state'
import { cn } from '@/lib/utils'
import { ProposalCard } from './ProposalCard'

type Filter = 'pending' | 'accepted' | 'history'

const HISTORY_STATUSES: Proposal['status'][] = [
  'rejected',
  'withdrawn',
  'completed',
  'cancelled',
]

export function Inbox() {
  return (
    <AuthGate>
      <InboxView />
    </AuthGate>
  )
}

function InboxView() {
  const proposals = useProposals()
  const [filter, setFilter] = useState<Filter>('pending')

  const filtered = useMemo(() => {
    const all = Array.from(proposals.values())
    const list =
      filter === 'pending'
        ? all.filter((p) => p.status === 'pending')
        : filter === 'accepted'
          ? all.filter((p) => p.status === 'accepted')
          : all.filter((p) => HISTORY_STATUSES.includes(p.status))
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis() ?? 0
      const tb = b.createdAt?.toMillis() ?? 0
      return tb - ta
    })
  }, [proposals, filter])

  const counts = useMemo(() => {
    const c = { pending: 0, accepted: 0, history: 0 }
    for (const p of proposals.values()) {
      if (p.status === 'pending') c.pending += 1
      else if (p.status === 'accepted') c.accepted += 1
      else if (HISTORY_STATUSES.includes(p.status)) c.history += 1
    }
    return c
  }, [proposals])

  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">Inbox</h1>
          <SignInButton />
        </div>
        <div className="flex gap-2">
          {(['pending', 'accepted', 'history'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                filter === f
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-700 ring-1 ring-neutral-200',
              )}
            >
              {f === 'pending' ? 'Pending' : f === 'accepted' ? 'Accepted' : 'History'}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">Nothing here.</p>
        ) : (
          filtered.map((p) => <ProposalCard key={p.id} proposal={p} />)
        )}
      </div>
    </div>
  )
}
