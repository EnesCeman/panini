import { ClipboardCheck, Copy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TEAMS, teamByCode } from '@/data/teams'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

const TEAM_CODES = new Set(TEAMS.map((t) => t.code))

type Match = {
  code: string
  teamCode: string
  num: number
  name: string
  status: 'missing' | 'have'
}

// Parse a free-form list. Handles 'IRN-2', 'IRN 2', 'IRN2', and the
// compact 'IRN 2,18,20' form (one prefix → multiple numbers).
function parseCodes(input: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  const upper = input.toUpperCase()
  const blocks = upper.matchAll(/([A-Z]{3})((?:[\s,;\-]*\d{1,2})+)/g)
  for (const block of blocks) {
    const teamCode = block[1]
    const numbers = Array.from(block[2].matchAll(/\d+/g)).map((m) =>
      parseInt(m[0], 10),
    )
    const knownTeam = TEAM_CODES.has(teamCode)
    for (const num of numbers) {
      const code = `${teamCode}-${num}`
      if (!knownTeam || num < 1 || num > 20) {
        invalid.push(code)
        continue
      }
      if (!seen.has(code)) {
        seen.add(code)
        valid.push(code)
      }
    }
  }
  return { valid, invalid }
}

function groupByTeam(codes: Iterable<string>): Map<string, number[]> {
  const out = new Map<string, number[]>()
  for (const code of codes) {
    const [team, numStr] = code.split('-')
    const num = parseInt(numStr, 10)
    const list = out.get(team) ?? []
    list.push(num)
    out.set(team, list)
  }
  for (const list of out.values()) list.sort((a, b) => a - b)
  return out
}

function formatGrouped(groups: Map<string, number[]>): string {
  const teams = Array.from(groups.keys()).sort()
  return teams.map((t) => `${t} ${groups.get(t)!.join(',')}`).join('\n')
}

type Props = {
  onClose: () => void
}

export function CodeChecker({ onClose }: Props) {
  const stickers = useStickersMap()
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => parseCodes(input), [input])

  const matches = useMemo<Match[]>(() => {
    return parsed.valid.map((code) => {
      const [teamCode, numStr] = code.split('-')
      const num = parseInt(numStr, 10)
      const sticker = stickers.get(code)
      const userName = sticker?.name ?? null
      const albumName = albumPlayerName(code)
      const name =
        userName ?? albumName ?? resolvePlayerLabel(code, null) ?? code
      const status: Match['status'] =
        (sticker?.count ?? 0) === 0 ? 'missing' : 'have'
      return { code, teamCode, num, name, status }
    })
  }, [parsed, stickers])

  const missing = matches.filter((m) => m.status === 'missing')
  const haveCount = matches.length - missing.length

  // Auto-select all missing whenever the parsed list changes; user can
  // then toggle off the ones they don't actually want to request.
  const parsedKey = parsed.valid.join(',')
  useEffect(() => {
    setSelected(
      new Set(
        matches.filter((m) => m.status === 'missing').map((m) => m.code),
      ),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedKey])

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(missing.map((m) => m.code)))
  }
  function clearAll() {
    setSelected(new Set())
  }

  const previewText = formatGrouped(groupByTeam(selected))

  async function copy() {
    if (!previewText) return
    try {
      await navigator.clipboard.writeText(previewText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error('Clipboard copy failed', e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">
          Bulk code check
        </h2>
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
        <p className="mb-2 text-xs text-neutral-600">
          Paste codes someone sent you (any format: <code>POR-5</code>,{' '}
          <code>POR 5</code>, or compact <code>POR 5,8,12</code>). I'll filter
          to the ones you're missing.
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. IRN 2,18,20  POR 5,8  GER 12"
          className="block w-full rounded-md border border-neutral-200 p-3 text-sm"
          rows={4}
        />

        {parsed.valid.length === 0 && parsed.invalid.length === 0 && (
          <p className="mt-3 text-[11px] text-neutral-500">
            Paste a list above — codes will appear below.
          </p>
        )}

        {(parsed.valid.length > 0 || parsed.invalid.length > 0) && (
          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
            Found <strong>{parsed.valid.length}</strong> valid:{' '}
            <strong className="text-emerald-700">
              {missing.length} missing
            </strong>
            , {haveCount} you already have
            {parsed.invalid.length > 0 && (
              <>
                , <span className="text-rose-700">{parsed.invalid.length} invalid</span>
              </>
            )}
            .
          </div>
        )}

        {missing.length > 0 && (
          <>
            <div className="mb-2 mt-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">
                Missing ({selected.size}/{missing.length} selected)
              </h3>
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  Clear
                </button>
              </div>
            </div>
            <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {missing.map((m, idx) => {
                const team = teamByCode(m.teamCode)
                const isSelected = selected.has(m.code)
                return (
                  <li
                    key={m.code}
                    className={cn(
                      idx !== missing.length - 1 && 'border-b border-neutral-100',
                    )}
                  >
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm active:bg-neutral-50">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(m.code)}
                        className="h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-neutral-900">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {team ? team.name : m.teamCode}
                        </div>
                      </div>
                      <span className="text-xs tabular-nums text-neutral-400">
                        {m.code}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {parsed.invalid.length > 0 && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
            <strong>Unrecognized:</strong> {parsed.invalid.join(', ')}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div
          className="border-t border-neutral-200 bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <pre className="mb-3 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 font-mono text-[11px] text-neutral-700">
            {previewText}
          </pre>
          <Button
            type="button"
            onClick={() => void copy()}
            className="w-full"
          >
            {copied ? (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy {selected.size} code{selected.size === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

