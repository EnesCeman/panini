import { Copy, Download, Upload, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GROUPS, TEAMS } from '@/data/teams'
import { useAdminLocks } from '@/lib/locks'
import { useStickersMap } from '@/lib/state'
import { useTrades } from '@/lib/trades'
import { cn } from '@/lib/utils'

type Props = {
  onClose: () => void
}

type Tone = 'missing' | 'spares'

type Section = {
  tone: Tone
  title: string
  hint: string
  totalCodes: number
  totalTeams: number
  text: string
}

export function CardsExport({ onClose }: Props) {
  const stickers = useStickersMap()
  const trades = useTrades()
  const locks = useAdminLocks(trades)
  const [withGroupHeaders, setWithGroupHeaders] = useState(false)
  const [copied, setCopied] = useState<Tone | null>(null)

  const sections = useMemo<Section[]>(() => {
    const missing = new Map<string, number[]>() // teamCode → [num,...]
    const spares = new Map<string, number[]>()
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        const count = sticker?.count ?? 0
        const outgoingLocks = locks.outgoing.get(code)?.length ?? 0
        const incomingLocks = locks.incoming.get(code)?.length ?? 0
        if (count === 0 && incomingLocks === 0) {
          const list = missing.get(team.code) ?? []
          list.push(i)
          missing.set(team.code, list)
        } else if (count - outgoingLocks >= 2) {
          const list = spares.get(team.code) ?? []
          list.push(i)
          spares.set(team.code, list)
        }
      }
    }
    const format = (byTeam: Map<string, number[]>): { text: string; codes: number; teams: number } => {
      const lines: string[] = []
      let codeCount = 0
      let teamCount = 0
      for (const g of GROUPS) {
        const teamsInGroup = TEAMS.filter((t) => t.group === g)
        const groupLines: string[] = []
        for (const team of teamsInGroup) {
          const nums = byTeam.get(team.code)
          if (!nums || nums.length === 0) continue
          groupLines.push(`${team.code} ${nums.join(',')}`)
          codeCount += nums.length
          teamCount += 1
        }
        if (groupLines.length === 0) continue
        if (withGroupHeaders) {
          if (lines.length > 0) lines.push('')
          lines.push(`Group ${g}:`)
        }
        lines.push(...groupLines)
      }
      return { text: lines.join('\n'), codes: codeCount, teams: teamCount }
    }
    const missingOut = format(missing)
    const sparesOut = format(spares)
    return [
      {
        tone: 'missing',
        title: 'Missing — codes I need',
        hint: 'Stickers you have 0 of, excluding ones already incoming in a locked pending trade.',
        totalCodes: missingOut.codes,
        totalTeams: missingOut.teams,
        text: missingOut.text,
      },
      {
        tone: 'spares',
        title: 'Duplicates — codes I have spare',
        hint: 'Stickers with at least one free spare after subtracting locked pending give-aways.',
        totalCodes: sparesOut.codes,
        totalTeams: sparesOut.teams,
        text: sparesOut.text,
      },
    ]
  }, [stickers, locks, withGroupHeaders])

  async function handleCopy(tone: Tone, text: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(tone)
      window.setTimeout(() => {
        setCopied((cur) => (cur === tone ? null : cur))
      }, 1500)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">Export lists</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1 text-neutral-500 hover:text-neutral-900"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-xs text-neutral-600">
          Copy your missing or duplicate stickers — grouped by team in album order.
        </p>

        <label className="mb-4 flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
          <input
            type="checkbox"
            checked={withGroupHeaders}
            onChange={(e) => setWithGroupHeaders(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Add <code className="rounded bg-neutral-100 px-1 font-mono text-[10px]">Group A:</code> headers
        </label>

        <div className="space-y-4">
          {sections.map((s) => (
            <SectionBlock
              key={s.tone}
              section={s}
              copied={copied === s.tone}
              onCopy={() => void handleCopy(s.tone, s.text)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionBlock({
  section,
  copied,
  onCopy,
}: {
  section: Section
  copied: boolean
  onCopy: () => void
}) {
  const isMissing = section.tone === 'missing'
  const Icon = isMissing ? Download : Upload
  const palette = isMissing
    ? {
        chip: 'bg-emerald-100 text-emerald-800',
        block: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
      }
    : {
        chip: 'bg-sky-100 text-sky-800',
        block: 'border-sky-200 bg-sky-50/60 text-sky-900',
      }
  const empty = section.totalCodes === 0
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-full',
            palette.chip,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">{section.title}</h3>
          <p className="text-[11px] text-neutral-500">{section.hint}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-neutral-700">
          {section.totalCodes} · {section.totalTeams} teams
        </span>
      </div>

      {empty ? (
        <p className="rounded-md border border-dashed border-neutral-200 px-3 py-4 text-center text-[11px] italic text-neutral-400">
          {section.tone === 'missing' ? 'Album complete — nothing missing.' : 'No duplicates yet.'}
        </p>
      ) : (
        <>
          <pre
            className={cn(
              'mb-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border p-3 font-mono text-xs',
              palette.block,
            )}
          >
            {section.text}
          </pre>
          <Button
            type="button"
            variant="outline"
            onClick={onCopy}
            className="h-9 w-full text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </Button>
        </>
      )}
    </section>
  )
}
