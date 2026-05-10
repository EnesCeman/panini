import { Check, Minus, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { teamByCode } from '@/data/teams'
import { parseCodes } from '@/lib/parseCodes'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { decrementMany, incrementMany, useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

type Direction = 'plus' | 'minus'

type Row = {
  code: string
  teamCode: string
  num: number
  name: string
  current: number
  next: number
  skip: boolean
  reason?: 'zero'
}

type Props = {
  onClose: () => void
}

export function BulkAdjuster({ onClose }: Props) {
  const stickers = useStickersMap()
  const [input, setInput] = useState('')
  const [direction, setDirection] = useState<Direction>('plus')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ applied: number; skipped: number } | null>(null)

  const parsed = useMemo(() => parseCodes(input), [input])

  const rows = useMemo<Row[]>(() => {
    return parsed.valid.map((code) => {
      const [teamCode, numStr] = code.split('-')
      const num = parseInt(numStr, 10)
      const sticker = stickers.get(code)
      const userName = sticker?.name ?? null
      const albumName = albumPlayerName(code)
      const name =
        userName ?? albumName ?? resolvePlayerLabel(code, null) ?? code
      const current = sticker?.count ?? 0
      const skip = direction === 'minus' && current <= 0
      const next = skip ? current : direction === 'plus' ? current + 1 : current - 1
      return {
        code,
        teamCode,
        num,
        name,
        current,
        next,
        skip,
        reason: skip ? 'zero' : undefined,
      }
    })
  }, [parsed, stickers, direction])

  const applyCount = rows.filter((r) => !r.skip).length
  const skipCount = rows.filter((r) => r.skip).length

  // Reset the success view when the user changes inputs after applying.
  useEffect(() => {
    if (done !== null) setDone(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, direction])

  async function apply() {
    const codes = rows.filter((r) => !r.skip).map((r) => r.code)
    if (codes.length === 0) return
    setBusy(true)
    try {
      if (direction === 'plus') await incrementMany(codes)
      else await decrementMany(codes)
      setDone({ applied: codes.length, skipped: skipCount })
      setInput('')
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">Bulk ±1</h2>
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
          {(['plus', 'minus'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5',
                direction === d
                  ? d === 'plus'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100',
              )}
            >
              {d === 'plus' ? (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  +1 received
                </>
              ) : (
                <>
                  <Minus className="h-3.5 w-3.5" />
                  -1 given
                </>
              )}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs text-neutral-600">
          {direction === 'plus'
            ? 'Paste codes for stickers you got — each one gets +1.'
            : 'Paste codes for stickers you gave away — each one gets -1. Codes already at 0 are skipped.'}
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="POR-5, POR-8, GER-12, IRN-2 …"
          className="block w-full rounded-md border border-neutral-200 p-3 font-mono text-sm"
          rows={4}
        />

        {parsed.valid.length === 0 && parsed.invalid.length === 0 && !done && (
          <p className="mt-3 text-[11px] text-neutral-500">
            Paste codes above — preview will show counts before/after.
          </p>
        )}

        {(parsed.valid.length > 0 || parsed.invalid.length > 0) && !done && (
          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
            Found <strong>{parsed.valid.length}</strong> valid:{' '}
            <strong className={direction === 'plus' ? 'text-emerald-700' : 'text-rose-700'}>
              {applyCount} will apply
            </strong>
            {skipCount > 0 && (
              <>
                ,{' '}
                <span className="text-amber-700">{skipCount} skipped (already at 0)</span>
              </>
            )}
            {parsed.invalid.length > 0 && (
              <>
                ,{' '}
                <span className="text-rose-700">{parsed.invalid.length} invalid</span>
              </>
            )}
            .
          </div>
        )}

        {done && (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
            Applied <strong>{done.applied}</strong> update{done.applied === 1 ? '' : 's'}
            {done.skipped > 0 && <> · {done.skipped} skipped</>}.
          </div>
        )}

        {rows.length > 0 && !done && (
          <>
            <div className="mb-2 mt-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">
                Preview ({applyCount}/{rows.length})
              </h3>
            </div>
            <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {rows.map((r, idx) => {
                const team = teamByCode(r.teamCode)
                return (
                  <li
                    key={r.code}
                    className={cn(
                      idx !== rows.length - 1 && 'border-b border-neutral-100',
                      r.skip && 'bg-neutral-50',
                    )}
                  >
                    <div className="flex items-center gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            'truncate font-medium',
                            r.skip ? 'text-neutral-400 line-through' : 'text-neutral-900',
                          )}
                        >
                          {r.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {team ? team.name : r.teamCode}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <CountChip count={r.current} muted />
                        <span className="text-neutral-400">→</span>
                        <CountChip
                          count={r.next}
                          tone={
                            r.skip
                              ? 'muted'
                              : direction === 'plus'
                                ? 'emerald'
                                : 'rose'
                          }
                        />
                      </div>
                      <span className="ml-1 hidden text-[10px] tabular-nums text-neutral-400 sm:inline">
                        {r.code}
                      </span>
                    </div>
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

      {applyCount > 0 && !done && (
        <div
          className="border-t border-neutral-200 bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <Button type="button" onClick={() => void apply()} disabled={busy} className="w-full">
            {busy ? (
              'Applying…'
            ) : direction === 'plus' ? (
              <>
                <Plus className="h-4 w-4" />
                Apply +1 to {applyCount}
              </>
            ) : (
              <>
                <Minus className="h-4 w-4" />
                Apply -1 to {applyCount}
              </>
            )}
          </Button>
        </div>
      )}

      {done && (
        <div
          className="border-t border-neutral-200 bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <Button type="button" onClick={onClose} className="w-full">
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      )}
    </div>
  )
}

function CountChip({ count, tone = 'default', muted }: { count: number; tone?: 'default' | 'emerald' | 'rose' | 'muted'; muted?: boolean }) {
  const cls =
    muted || tone === 'muted'
      ? 'bg-neutral-100 text-neutral-500'
      : tone === 'emerald'
        ? 'bg-emerald-600 text-white'
        : tone === 'rose'
          ? 'bg-rose-600 text-white'
          : 'bg-neutral-200 text-neutral-700'
  return (
    <span className={cn('inline-flex h-6 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] font-bold', cls)}>
      {count}
    </span>
  )
}
