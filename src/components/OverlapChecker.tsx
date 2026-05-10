import { ClipboardCheck, Copy, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TEAMS } from '@/data/teams'
import { parseCodes } from '@/lib/parseCodes'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { formatGroupedCodes } from '@/lib/submissions'

const TEAM_BY_CODE = new Map(TEAMS.map((t) => [t.code, t]))

type Props = {
  onClose: () => void
}

export function OverlapChecker({ onClose }: Props) {
  const stickers = useStickersMap()
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [copied, setCopied] = useState(false)

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

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
              List A
            </label>
            <textarea
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              placeholder="POR 5, GER 12, ARG 9 …"
              rows={4}
              className="block w-full rounded-md border border-neutral-200 p-3 font-mono text-sm"
            />
            {parsedA.valid.length > 0 && (
              <p className="mt-1 text-[11px] text-neutral-500">
                {parsedA.valid.length} valid
                {parsedA.invalid.length > 0 && ` · ${parsedA.invalid.length} invalid`}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
              List B
            </label>
            <textarea
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              placeholder="POR 5, BRA 18, GER 12 …"
              rows={4}
              className="block w-full rounded-md border border-neutral-200 p-3 font-mono text-sm"
            />
            {parsedB.valid.length > 0 && (
              <p className="mt-1 text-[11px] text-neutral-500">
                {parsedB.valid.length} valid
                {parsedB.invalid.length > 0 && ` · ${parsedB.invalid.length} invalid`}
              </p>
            )}
          </div>
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
