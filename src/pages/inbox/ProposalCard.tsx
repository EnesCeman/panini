import { Flag } from '@/components/Flag'
import { ProposalActions } from '@/components/inbox/ProposalActions'
import { teamByCode } from '@/data/teams'
import { resolvePlayerLabel } from '@/lib/playerName'
import type { Proposal } from '@/lib/proposalSchema'

const STATUS_PILL: Record<Proposal['status'], string> = {
  pending: 'bg-amber-100 text-amber-900',
  accepted: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-rose-100 text-rose-900',
  withdrawn: 'bg-neutral-200 text-neutral-700',
  completed: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-neutral-200 text-neutral-700',
}

function age(p: Proposal): string {
  if (!p.createdAt) return ''
  const now = Date.now()
  const created = p.createdAt.toMillis()
  const ms = now - created
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <header className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_PILL[proposal.status]}`}
        >
          {proposal.status}
        </span>
        <span className="text-[11px] text-neutral-500">{age(proposal)}</span>
        <span className="ml-auto text-[11px] text-neutral-500">
          {proposal.proposer.name}
        </span>
      </header>

      <div className="text-[11px] text-neutral-600">
        <span className="font-medium text-neutral-800">Contact:</span>{' '}
        {proposal.proposer.contact}
      </div>

      <ul className="flex flex-col gap-2">
        {proposal.trades.map((t, idx) => (
          <li key={idx} className="rounded bg-neutral-50 p-2 text-xs">
            <div className="text-[10px] font-semibold uppercase text-neutral-500">
              Trade {idx + 1}
            </div>
            <div className="mt-1">
              {t.offered.map((c) => <Chip key={c} code={c} />)}
              <span className="mx-1 text-neutral-400">→</span>
              {t.requested.map((r) => <Chip key={r.code} code={r.code} qty={r.qty} />)}
            </div>
          </li>
        ))}
      </ul>

      {proposal.proposerNote && (
        <p className="rounded bg-neutral-50 p-2 text-xs italic text-neutral-700">
          "{proposal.proposerNote}"
        </p>
      )}
      {proposal.ownerNote && (
        <p className="rounded bg-blue-50 p-2 text-xs text-blue-900">
          You: {proposal.ownerNote}
        </p>
      )}

      <ProposalActions proposal={proposal} />
    </article>
  )
}

function Chip({ code, qty }: { code: string; qty?: number }) {
  const teamCode = code.split('-')[0]
  const team = teamByCode(teamCode)
  return (
    <span className="mr-1 inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px]">
      {team && <Flag code={team.code} className="h-3 w-4.5" />}
      <span className="font-mono">{code}</span>
      {qty && qty > 1 && <span className="text-neutral-500">×{qty}</span>}
      <span className="max-w-[90px] truncate">{resolvePlayerLabel(code, null)}</span>
    </span>
  )
}
