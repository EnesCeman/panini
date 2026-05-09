import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/button'
import { teamByCode } from '@/data/teams'
import { useT } from '@/lib/i18n'
import { resolvePlayerLabel } from '@/lib/playerName'
import type { Proposal } from '@/lib/proposalSchema'
import { fetchProposalById, withdrawProposal } from '@/lib/proposals'
import { useProposal } from '@/lib/state'

const STATUS_COLOR: Record<Proposal['status'], string> = {
  pending: 'bg-amber-100 text-amber-900',
  accepted: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-rose-100 text-rose-900',
  withdrawn: 'bg-neutral-200 text-neutral-700',
  completed: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-neutral-200 text-neutral-700',
}

export function ProposalTracking() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const justSubmitted = params.get('just') === '1'
  const live = useProposal(id)
  const [fallback, setFallback] = useState<Proposal | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    if (live) return
    fetchProposalById(id).then(setFallback)
  }, [id, live])

  const proposal = live ?? fallback ?? null

  if (proposal === null) {
    return (
      <div className="px-4 pt-8 text-center text-sm text-neutral-500">
        {t('tracking.notFound')}
      </div>
    )
  }
  if (proposal === undefined) {
    return (
      <div className="px-4 pt-8 text-center text-sm text-neutral-500">
        {t('tracking.loading')}
      </div>
    )
  }

  return <ProposalView proposal={proposal} justSubmitted={justSubmitted} />
}

function ProposalView({
  proposal,
  justSubmitted,
}: {
  proposal: Proposal
  justSubmitted: boolean
}) {
  const t = useT()
  const [withdrawing, setWithdrawing] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''

  const STATUS_LABEL: Record<Proposal['status'], string> = {
    pending: t('tracking.status.pending'),
    accepted: t('tracking.status.accepted'),
    rejected: t('tracking.status.rejected'),
    withdrawn: t('tracking.status.withdrawn'),
    completed: t('tracking.status.completed'),
    cancelled: t('tracking.status.cancelled'),
  }

  async function copy() {
    await navigator.clipboard.writeText(url)
  }

  async function onWithdraw() {
    if (!confirm(t('tracking.withdraw.confirm'))) return
    setWithdrawing(true)
    try {
      await withdrawProposal(proposal.id)
    } catch (e) {
      console.error(e)
      alert(t('tracking.withdraw.failed'))
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-3 md:px-6">
      <Link
        to="/market"
        className="inline-flex items-center gap-1 self-start text-xs text-neutral-600 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('tracking.back')}
      </Link>
      {justSubmitted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <p className="font-semibold">{t('tracking.submitted.title')}</p>
          <p>{t('tracking.submitted.body')}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => void copy()}
          >
            {t('tracking.copyLink')}
          </Button>
        </div>
      )}

      <div
        className={`rounded-xl px-3 py-2 text-sm font-semibold ${STATUS_COLOR[proposal.status]}`}
      >
        {STATUS_LABEL[proposal.status]}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">
          {t('tracking.trades')}
        </h2>
        <ul className="flex flex-col gap-3">
          {proposal.trades.map((trade, idx) => (
            <li key={idx} className="rounded-lg bg-neutral-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                {t('tracking.trade.n', { n: idx + 1 })}
              </div>
              <div className="mt-2">
                <div className="text-[11px] uppercase text-neutral-500">
                  {t('tracking.trade.offer')}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {trade.offered.map((code) => (
                    <CodeChip key={code} code={code} />
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <div className="text-[11px] uppercase text-neutral-500">
                  {t('tracking.trade.want')}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {trade.requested.map((r) => (
                    <CodeChip key={r.code} code={r.code} qty={r.qty} />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {(proposal.proposerNote || proposal.ownerNote) && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          {proposal.proposerNote && (
            <div className="mb-2">
              <div className="text-[11px] uppercase text-neutral-500">
                {t('tracking.note.your')}
              </div>
              <p className="mt-1 text-neutral-800">{proposal.proposerNote}</p>
            </div>
          )}
          {proposal.ownerNote && (
            <div>
              <div className="text-[11px] uppercase text-neutral-500">
                {t('tracking.note.owner')}
              </div>
              <p className="mt-1 text-neutral-800">{proposal.ownerNote}</p>
            </div>
          )}
        </section>
      )}

      {proposal.status === 'pending' && (
        <Button
          type="button"
          variant="outline"
          onClick={() => void onWithdraw()}
          disabled={withdrawing}
        >
          {withdrawing ? t('tracking.withdraw.busy') : t('tracking.withdraw')}
        </Button>
      )}
    </div>
  )
}

function CodeChip({ code, qty }: { code: string; qty?: number }) {
  const teamCode = code.split('-')[0]
  const team = teamByCode(teamCode)
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px]">
      {team && <Flag code={team.code} className="h-3 w-4.5" />}
      <span className="font-mono">{code}</span>
      {qty && qty > 1 && <span className="text-neutral-500">×{qty}</span>}
      <span className="max-w-[110px] truncate text-neutral-700">
        {resolvePlayerLabel(code, null)}
      </span>
    </span>
  )
}
