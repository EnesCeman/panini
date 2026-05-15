import { ClipboardCheck, Copy, Inbox, Lock, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GROUPS, TEAMS, teamByCode } from '@/data/teams'
import { useAdminLocks, type LockedTradeRef } from '@/lib/locks'
import { parseCodes } from '@/lib/parseCodes'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { useTrades } from '@/lib/trades'
import { cn } from '@/lib/utils'

const TEAM_ALBUM_INDEX = new Map(TEAMS.map((t, i) => [t.code, i]))

type Mode = 'find-missing' | 'find-duplicates'

type Match = {
  code: string
  teamCode: string
  num: number
  name: string
  count: number
  outgoingLocks: LockedTradeRef[]
  incomingLocks: LockedTradeRef[]
}

type ModeCopy = {
  toggle: string
  hint: string
  emptyHint: string
  listHeader: string
  lockedHeader: string
  alreadyLabel: string
}

const COPY: Record<Mode, ModeCopy> = {
  'find-missing': {
    toggle: 'What I need',
    hint: "Paste the list someone sent you of cards they have spare. I'll show you which of those you're missing.",
    emptyHint: 'Paste codes above — I\'ll filter to the ones you\'re missing.',
    listHeader: 'Missing (you might want to ask for these)',
    lockedHeader: 'Already coming via pending trades',
    alreadyLabel: 'you already have',
  },
  'find-duplicates': {
    toggle: 'What I can give',
    hint: "Paste a list of cards someone is missing. I'll show which of those you have as duplicates and could give.",
    emptyHint: 'Paste codes above — I\'ll filter to the ones you have as duplicates.',
    listHeader: 'Duplicates you have (you could offer these)',
    lockedHeader: 'Already promised in pending trades',
    alreadyLabel: "you don't have / have only one",
  },
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

function formatGroupedAlbum(
  groups: Map<string, number[]>,
  withGroupHeaders: boolean,
): string {
  const lines: string[] = []
  for (const g of GROUPS) {
    const teamsInGroup = TEAMS.filter((t) => t.group === g)
    const groupLines: string[] = []
    for (const team of teamsInGroup) {
      const nums = groups.get(team.code)
      if (!nums || nums.length === 0) continue
      groupLines.push(`${team.code} ${nums.join(',')}`)
    }
    if (groupLines.length === 0) continue
    if (withGroupHeaders) {
      if (lines.length > 0) lines.push('')
      lines.push(`Group ${g}:`)
    }
    lines.push(...groupLines)
  }
  return lines.join('\n')
}

function compareAlbum(a: { teamCode: string; num: number }, b: { teamCode: string; num: number }): number {
  const ai = TEAM_ALBUM_INDEX.get(a.teamCode) ?? Number.MAX_SAFE_INTEGER
  const bi = TEAM_ALBUM_INDEX.get(b.teamCode) ?? Number.MAX_SAFE_INTEGER
  return ai !== bi ? ai - bi : a.num - b.num
}

type Props = {
  onClose: () => void
}

export function CodeChecker({ onClose }: Props) {
  const stickers = useStickersMap()
  const trades = useTrades()
  const locks = useAdminLocks(trades)
  const [mode, setMode] = useState<Mode>('find-missing')
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [withGroupHeaders, setWithGroupHeaders] = useState(false)

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
      return {
        code,
        teamCode,
        num,
        name,
        count: sticker?.count ?? 0,
        outgoingLocks: locks.outgoing.get(code) ?? [],
        incomingLocks: locks.incoming.get(code) ?? [],
      }
    })
  }, [parsed, stickers, locks])

  // Free actionable = match is in scope AND not already covered by a locked
  // pending trade. Locked actionable = same scope, but a pending trade
  // already handles it (incoming for find-missing, outgoing for duplicates).
  // For duplicates we compare spare count vs outgoing locks so a sticker
  // with extra spares beyond what's locked still shows as free.
  const { freeActionable, lockedActionable } = useMemo(() => {
    if (mode === 'find-missing') {
      const free = matches.filter((m) => m.count === 0 && m.incomingLocks.length === 0)
      const locked = matches.filter((m) => m.count === 0 && m.incomingLocks.length > 0)
      free.sort(compareAlbum)
      locked.sort(compareAlbum)
      return { freeActionable: free, lockedActionable: locked }
    }
    const free = matches.filter((m) => m.count >= 2 && m.count - 1 - m.outgoingLocks.length > 0)
    const locked = matches.filter((m) => m.count >= 2 && m.count - 1 - m.outgoingLocks.length <= 0)
    free.sort(compareAlbum)
    locked.sort(compareAlbum)
    return { freeActionable: free, lockedActionable: locked }
  }, [matches, mode])

  const actionable = useMemo<Match[]>(
    () => [...freeActionable, ...lockedActionable],
    [freeActionable, lockedActionable],
  )

  const otherCount = matches.length - actionable.length

  // Auto-select free items only — locked ones stay opt-in since they're
  // either already coming in or already promised away.
  const parsedKey = parsed.valid.join(',')
  useEffect(() => {
    setSelected(new Set(freeActionable.map((m) => m.code)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedKey, mode])

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(actionable.map((m) => m.code)))
  }
  function clearAll() {
    setSelected(new Set())
  }

  const previewText = formatGroupedAlbum(groupByTeam(selected), withGroupHeaders)

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
        <div className="mb-3 inline-flex overflow-hidden rounded-md border border-neutral-200 text-xs font-medium">
          {(['find-missing', 'find-duplicates'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'px-3 py-1.5',
                mode === m
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100',
              )}
            >
              {COPY[m].toggle}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs text-neutral-600">{COPY[mode].hint}</p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="POR-5, POR-8, GER-12, IRN-2 …"
          className="block w-full rounded-md border border-neutral-200 p-3 font-mono text-sm"
          rows={4}
        />

        {parsed.valid.length === 0 && parsed.invalid.length === 0 && (
          <p className="mt-3 text-[11px] text-neutral-500">
            {COPY[mode].emptyHint}
          </p>
        )}

        {(parsed.valid.length > 0 || parsed.invalid.length > 0) && (
          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
            Found <strong>{parsed.valid.length}</strong> valid:{' '}
            <strong className="text-emerald-700">
              {freeActionable.length}{' '}
              {mode === 'find-missing' ? 'missing' : 'duplicates'}
            </strong>
            {lockedActionable.length > 0 && (
              <>
                {' '}·{' '}
                <strong className="text-amber-700">
                  {lockedActionable.length}{' '}
                  {mode === 'find-missing' ? 'already coming' : 'already promised'}
                </strong>
              </>
            )}
            , {otherCount} {COPY[mode].alreadyLabel}
            {parsed.invalid.length > 0 && (
              <>
                ,{' '}
                <span className="text-rose-700">
                  {parsed.invalid.length} invalid
                </span>
              </>
            )}
            .
          </div>
        )}

        {actionable.length > 0 && (
          <div className="mb-2 mt-4 flex items-center justify-end gap-3 text-xs">
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
        )}

        {freeActionable.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">
              {COPY[mode].listHeader} (
              {freeActionable.filter((m) => selected.has(m.code)).length}/
              {freeActionable.length})
            </h3>
            <MatchList
              matches={freeActionable}
              mode={mode}
              selected={selected}
              onToggle={toggle}
            />
          </>
        )}

        {lockedActionable.length > 0 && (
          <>
            <h3 className="mb-2 mt-4 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
              {mode === 'find-missing' ? (
                <Inbox className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {COPY[mode].lockedHeader} (
              {lockedActionable.filter((m) => selected.has(m.code)).length}/
              {lockedActionable.length})
            </h3>
            <MatchList
              matches={lockedActionable}
              mode={mode}
              selected={selected}
              onToggle={toggle}
              locked
            />
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
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
            <input
              type="checkbox"
              checked={withGroupHeaders}
              onChange={(e) => setWithGroupHeaders(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Add <code className="rounded bg-neutral-100 px-1 font-mono text-[10px]">Group A:</code> headers
          </label>
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

function MatchList({
  matches,
  mode,
  selected,
  onToggle,
  locked,
}: {
  matches: Match[]
  mode: Mode
  selected: Set<string>
  onToggle: (code: string) => void
  locked?: boolean
}) {
  return (
    <ul
      className={cn(
        'overflow-hidden rounded-lg border bg-white',
        locked ? 'border-amber-200' : 'border-neutral-200',
      )}
    >
      {matches.map((m, idx) => {
        const team = teamByCode(m.teamCode)
        const isSelected = selected.has(m.code)
        const trades =
          mode === 'find-missing' ? m.incomingLocks : m.outgoingLocks
        return (
          <li
            key={m.code}
            className={cn(
              idx !== matches.length - 1 &&
                (locked ? 'border-b border-amber-100' : 'border-b border-neutral-100'),
            )}
          >
            <label
              className={cn(
                'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm',
                locked ? 'active:bg-amber-50' : 'active:bg-neutral-50',
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(m.code)}
                className="h-4 w-4"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-neutral-900">
                  {m.name}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {team ? team.name : m.teamCode}
                  {mode === 'find-duplicates' && ` · ${m.count - 1} spare`}
                  {locked && trades.length > 0 && (
                    <>
                      {' · '}
                      <span className="text-amber-700">
                        {mode === 'find-missing' ? 'from' : 'in'}{' '}
                        {trades[0].subject}
                        {trades.length > 1 && ` +${trades.length - 1}`}
                      </span>
                    </>
                  )}
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
  )
}
