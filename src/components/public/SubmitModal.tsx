import { ClipboardCheck, Copy, Download, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TEAMS } from '@/data/teams'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { usePublicT } from '@/lib/publicI18n'
import { formatGroupedCodes } from '@/lib/submissions'
import { useStickersMap } from '@/lib/state'

const TEAM_BY_CODE = new Map(TEAMS.map((t) => [t.code, t]))

export type SubmittedRequest = {
  id: string
  theyHave: string[]
  theyWant: string[]
}

type Props = {
  submitted: SubmittedRequest
  onAnother: () => void
}

export function SuccessModal({ submitted, onAnother }: Props) {
  const t = usePublicT()
  const stickers = useStickersMap()
  const [copied, setCopied] = useState(false)

  const haveRows = useMemo(() => buildRows(submitted.theyHave, stickers), [submitted.theyHave, stickers])
  const wantRows = useMemo(() => buildRows(submitted.theyWant, stickers), [submitted.theyWant, stickers])

  const copyText = useMemo(() => {
    const parts: string[] = []
    if (submitted.theyHave.length > 0) {
      parts.push(`=== ${t('public.success.haveSection')} ===`)
      parts.push(formatGroupedCodes(submitted.theyHave))
    }
    if (submitted.theyWant.length > 0) {
      if (parts.length > 0) parts.push('')
      parts.push(`=== ${t('public.success.wantSection')} ===`)
      parts.push(formatGroupedCodes(submitted.theyWant))
    }
    return parts.join('\n')
  }, [submitted, t])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error(e)
    }
  }

  function handleCsv() {
    const csv = buildCsv(haveRows, wantRows, t)
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `panini-trade-${submitted.id.slice(0, 6)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">
          {t('public.success.title')}
        </h2>
        <button
          type="button"
          onClick={onAnother}
          aria-label="Close"
          className="rounded-full p-1 text-neutral-500 hover:text-neutral-900"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-4 text-sm text-neutral-700">{t('public.success.body')}</p>

        <div className="flex gap-2">
          <Button type="button" onClick={handleCopy} className="flex-1" variant="outline">
            {copied ? (
              <>
                <ClipboardCheck className="h-4 w-4" />
                {t('public.success.copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t('public.success.copy')}
              </>
            )}
          </Button>
          <Button type="button" onClick={handleCsv} className="flex-1" variant="outline">
            <Download className="h-4 w-4" />
            {t('public.success.csv')}
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          {haveRows.length > 0 && (
            <RowSection title={t('public.success.haveSection')} rows={haveRows} />
          )}
          {wantRows.length > 0 && (
            <RowSection title={t('public.success.wantSection')} rows={wantRows} />
          )}
        </div>
      </div>

      <div
        className="border-t border-neutral-200 bg-white px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <Button type="button" onClick={onAnother} className="w-full">
          {t('public.success.again')}
        </Button>
      </div>
    </div>
  )
}

type Row = { code: string; teamName: string; num: number; name: string }

function buildRows(codes: string[], stickers: Map<string, { name: string | null }>): Row[] {
  return codes.map((code) => {
    const [teamCode, numStr] = code.split('-')
    const team = TEAM_BY_CODE.get(teamCode)
    const num = parseInt(numStr, 10)
    const userName = stickers.get(code)?.name ?? null
    const album = albumPlayerName(code)
    const name = userName ?? album ?? resolvePlayerLabel(code, null) ?? code
    return {
      code,
      teamName: team?.name ?? teamCode,
      num,
      name,
    }
  })
}

function RowSection({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title} · {rows.length}
      </h3>
      <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {rows.map((r, idx) => (
          <li
            key={r.code}
            className={
              idx !== rows.length - 1 ? 'border-b border-neutral-100' : undefined
            }
          >
            <div className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-neutral-900">{r.name}</div>
                <div className="text-[11px] text-neutral-500">{r.teamName}</div>
              </div>
              <span className="text-xs tabular-nums text-neutral-400">{r.code}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function buildCsv(haveRows: Row[], wantRows: Row[], t: ReturnType<typeof usePublicT>): string {
  const haveLabel = t('public.success.haveSection')
  const wantLabel = t('public.success.wantSection')
  const lines = ['Code,Team,Num,Name,Side']
  for (const r of haveRows) {
    lines.push(
      [r.code, csvEscape(r.teamName), r.num.toString(), csvEscape(r.name), csvEscape(haveLabel)].join(','),
    )
  }
  for (const r of wantRows) {
    lines.push(
      [r.code, csvEscape(r.teamName), r.num.toString(), csvEscape(r.name), csvEscape(wantLabel)].join(','),
    )
  }
  return lines.join('\n')
}
