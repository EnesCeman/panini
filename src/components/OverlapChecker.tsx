import { ClipboardCheck, Copy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TEAMS } from '@/data/teams'
import { parseCodes } from '@/lib/parseCodes'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { formatGroupedCodes } from '@/lib/submissions'
import { subscribeTrades, useTrades } from '@/lib/trades'

const TEAM_BY_CODE = new Map(TEAMS.map((t) => [t.code, t]))

type Props = {
  onClose: () => void
}

export function OverlapChecker({ onClose }: Props) {
  const stickers = useStickersMap()
  const trades = useTrades()
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsub = subscribeTrades()
    return () => unsub()
  }, [])

  const tradeOptions = useMemo(() => {
    const out: { value: string; label: string; codes: string[] }[] = []
    const sorted = Array.from(trades.values()).sort((a, b) => {
      // Pending first, then most-recently-updated.
      const aPending = a.status === 'pending' ? 0 : 1
      const bPending = b.status === 'pending' ? 0 : 1
      if (aPending !== bPending) return aPending - bPending
      const ta = a.updatedAt?.toMillis() ?? 0
      const tb = b.updatedAt?.toMillis() ?? 0
      return tb - ta
    })
    for (const t of sorted) {
      const subj = t.subject.trim().length > 0 ? t.subject : 'Untitled'
      const tag = t.status === 'pending' ? '' : ` (${t.status})`
      if (t.give.length > 0) {
        out.push({
          value: `${t.id}:give`,
          label: `${subj} · giving ${t.give.length}${tag}`,
          codes: t.give,
        })
      }
      if (t.get.length > 0) {
        out.push({
          value: `${t.id}:get`,
          label: `${subj} · getting ${t.get.length}${tag}`,
          codes: t.get,
        })
      }
    }
    return out
  }, [trades])

  function pullFromTrade(target: 'A' | 'B', value: string) {
    if (!value) return
    const opt = tradeOptions.find((o) => o.value === value)
    if (!opt) return
    const text = formatGroupedCodes(opt.codes)
    if (target === 'A') setTextA(text)
    else setTextB(text)
  }

  const parsedA = useMemo(() => parseCodes(textA), [textA])
  const parsedB = useMemo(() => parseCodes(textB), [textB])

  const overlap = useMemo(() => {
    const setB = new Set(parsedB.valid)
    const seen = new Set<string>()
    const out: string[] = []
    for (const code of parsedA.valid) {
      if (setB.has(code) && !seen.has(code)) {
        seen.add(code)
        out.push(code)
      }
    }
    return out
  }, [parsedA, parsedB])

  const overlapText = useMemo(() => formatGroupedCodes(overlap), [overlap])

  const rows = useMemo(() => {
    return overlap.map((code) => {
      const [teamCode, numStr] = code.split('-')
      const team = TEAM_BY_CODE.get(teamCode)
      const num = parseInt(numStr, 10)
      const userName = stickers.get(code)?.name ?? null
      const album = albumPlayerName(code)
      const name = userName ?? album ?? resolvePlayerLabel(code, null) ?? code
      return { code, teamName: team?.name ?? teamCode, num, name }
    })
  }, [overlap, stickers])

  async function handleCopy() {
    if (overlap.length === 0) return
    try {
      await navigator.clipboard.writeText(overlapText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
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
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">Overlap check</h2>
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
          Paste two code lists. Anything that appears in both shows up below — useful for
          spotting the same sticker promised across two pending trades.
        </p>

        <div className="space-y-4">
          <ListInput
            label="List A"
            value={textA}
            onChange={setTextA}
            placeholder="POR 5, GER 12, ARG 9 …"
            tradeOptions={tradeOptions}
            onPullFromTrade={(v) => pullFromTrade('A', v)}
            validCount={parsedA.valid.length}
            invalidCount={parsedA.invalid.length}
          />
          <ListInput
            label="List B"
            value={textB}
            onChange={setTextB}
            placeholder="POR 5, BRA 18, GER 12 …"
            tradeOptions={tradeOptions}
            onPullFromTrade={(v) => pullFromTrade('B', v)}
            validCount={parsedB.valid.length}
            invalidCount={parsedB.invalid.length}
          />
        </div>

        {parsedA.valid.length > 0 && parsedB.valid.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">
                Overlap ({overlap.length})
              </h3>
              {overlap.length === 0 && (
                <span className="text-[11px] text-emerald-700">No overlap — clear.</span>
              )}
            </div>

            {overlap.length > 0 && (
              <>
                <pre className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-3 font-mono text-xs text-amber-900">
                  {overlapText}
                </pre>
                <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  {rows.map((r, idx) => (
                    <li
                      key={r.code}
                      className={
                        idx !== rows.length - 1 ? 'border-b border-neutral-100' : undefined
                      }
                    >
                      <div className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-mono font-semibold text-neutral-900">
                            {r.code}
                          </div>
                          <div className="truncate text-[11px] text-neutral-600">
                            {r.name} · {r.teamName}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {overlap.length > 0 && (
        <div
          className="border-t border-neutral-200 bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <Button type="button" onClick={() => void handleCopy()} className="w-full">
            {copied ? (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy overlap ({overlap.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

type ListInputProps = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  tradeOptions: { value: string; label: string; codes: string[] }[]
  onPullFromTrade: (value: string) => void
  validCount: number
  invalidCount: number
}

function ListInput({
  label,
  value,
  onChange,
  placeholder,
  tradeOptions,
  onPullFromTrade,
  validCount,
  invalidCount,
}: ListInputProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
          {label}
        </label>
        {tradeOptions.length > 0 && (
          <select
            onChange={(e) => {
              onPullFromTrade(e.target.value)
              e.target.value = ''
            }}
            defaultValue=""
            className="rounded border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-100"
          >
            <option value="" disabled>
              Pull from trade…
            </option>
            {tradeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="block w-full rounded-md border border-neutral-200 p-3 font-mono text-sm"
      />
      {validCount > 0 && (
        <p className="mt-1 text-[11px] text-neutral-500">
          {validCount} valid
          {invalidCount > 0 && ` · ${invalidCount} invalid`}
        </p>
      )}
    </div>
  )
}
