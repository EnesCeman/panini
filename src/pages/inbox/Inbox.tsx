import { Check, ClipboardCheck, Copy, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AuthGate } from '@/components/AuthGate'
import { SignInButton } from '@/components/SignInButton'
import { Button } from '@/components/ui/button'
import { TEAMS } from '@/data/teams'
import {
  deleteSubmission,
  formatGroupedCodes,
  markSubmissionHandled,
  subscribeSubmissions,
  useSubmissions,
  type Submission,
} from '@/lib/submissions'
import { cn } from '@/lib/utils'

const TEAM_BY_CODE = new Map(TEAMS.map((t) => [t.code, t]))

type Filter = 'pending' | 'handled'

export function Inbox() {
  return (
    <AuthGate>
      <InboxView />
    </AuthGate>
  )
}

function InboxView() {
  const submissions = useSubmissions()
  const [filter, setFilter] = useState<Filter>('pending')

  useEffect(() => {
    const unsub = subscribeSubmissions()
    return () => unsub()
  }, [])

  const filtered = useMemo(() => {
    const all = Array.from(submissions.values())
    const list = all.filter((s) => (filter === 'pending' ? !s.handled : s.handled))
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis() ?? 0
      const tb = b.createdAt?.toMillis() ?? 0
      return tb - ta
    })
  }, [submissions, filter])

  const counts = useMemo(() => {
    let pending = 0
    let handled = 0
    for (const s of submissions.values()) {
      if (s.handled) handled += 1
      else pending += 1
    }
    return { pending, handled }
  }, [submissions])

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
          {(['pending', 'handled'] as const).map((f) => (
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
              {f === 'pending' ? 'Pending' : 'Handled'}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">Nothing here.</p>
        ) : (
          filtered.map((s) => <SubmissionCard key={s.id} submission={s} />)
        )}
      </div>
    </div>
  )
}

function SubmissionCard({ submission }: { submission: Submission }) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<'handle' | 'delete' | null>(null)

  const copyText = useMemo(() => {
    const parts: string[] = []
    parts.push(`${submission.name} · ${submission.contact}`)
    if (submission.note) parts.push(`Note: ${submission.note}`)
    if (submission.theyHave.length > 0) {
      parts.push('')
      parts.push(`=== Has (you're missing) · ${submission.theyHave.length} ===`)
      parts.push(formatGroupedCodes(submission.theyHave))
    }
    if (submission.theyWant.length > 0) {
      parts.push('')
      parts.push(`=== Wants (your spares) · ${submission.theyWant.length} ===`)
      parts.push(formatGroupedCodes(submission.theyWant))
    }
    return parts.join('\n')
  }, [submission])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleToggleHandled() {
    setBusy('handle')
    try {
      await markSubmissionHandled(submission.id, !submission.handled)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return
    setBusy('delete')
    try {
      await deleteSubmission(submission.id)
    } catch (e) {
      console.error(e)
      setBusy(null)
    }
  }

  const when = submission.createdAt
    ? formatDateTime(submission.createdAt.toMillis())
    : '—'

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-neutral-900">
              {submission.name}
            </div>
            <div className="truncate text-[11px] text-neutral-600">
              {submission.contact}
            </div>
          </div>
          <div className="text-[10px] tabular-nums text-neutral-400">{when}</div>
        </div>
        {submission.note && (
          <p className="mt-1.5 whitespace-pre-wrap rounded border border-neutral-100 bg-neutral-50 p-2 text-[11px] text-neutral-700">
            {submission.note}
          </p>
        )}
      </div>

      {submission.theyHave.length > 0 && (
        <CodesBlock
          title={`Has (you're missing) · ${submission.theyHave.length}`}
          codes={submission.theyHave}
          tone="emerald"
        />
      )}
      {submission.theyWant.length > 0 && (
        <CodesBlock
          title={`Wants (your spares) · ${submission.theyWant.length}`}
          codes={submission.theyWant}
          tone="amber"
        />
      )}

      <div className="flex flex-wrap gap-2 border-t border-neutral-100 px-3 py-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <ClipboardCheck className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleToggleHandled}
          disabled={busy !== null}
        >
          {submission.handled ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Mark pending
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Mark handled
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={busy !== null}
          className="text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  )
}

function CodesBlock({
  title,
  codes,
  tone,
}: {
  title: string
  codes: string[]
  tone: 'emerald' | 'amber'
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const code of codes) {
      const [team, numStr] = code.split('-')
      const num = parseInt(numStr, 10)
      if (!team || Number.isNaN(num)) continue
      const list = map.get(team) ?? []
      list.push(num)
      map.set(team, list)
    }
    for (const list of map.values()) list.sort((a, b) => a - b)
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [codes])

  return (
    <div className="border-b border-neutral-100 px-3 py-2.5">
      <div
        className={cn(
          'mb-1.5 text-[10px] font-semibold uppercase tracking-wider',
          tone === 'emerald' ? 'text-emerald-700' : 'text-amber-700',
        )}
      >
        {title}
      </div>
      <ul className="space-y-0.5">
        {grouped.map(([teamCode, nums]) => {
          const team = TEAM_BY_CODE.get(teamCode)
          return (
            <li key={teamCode} className="flex items-baseline gap-2 font-mono text-[11px]">
              <span className="w-9 shrink-0 font-semibold text-neutral-900">{teamCode}</span>
              <span className="text-neutral-700">{nums.join(', ')}</span>
              {team && (
                <span className="ml-auto truncate font-sans text-[10px] text-neutral-500">
                  {team.name}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function formatDateTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
