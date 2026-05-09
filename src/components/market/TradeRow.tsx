import { Minus, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Flag } from '@/components/Flag'
import { stickerKind, teamByCode } from '@/data/teams'
import { useT } from '@/lib/i18n'
import { resolvePlayerLabel } from '@/lib/playerName'
import { availableSpare } from '@/lib/reservations'
import { sumQty, type Trade } from '@/lib/proposalSchema'
import { useReservations, useStickersMap } from '@/lib/state'
import { StickerPicker } from './StickerPicker'
import { RatioBadge } from './RatioBadge'

type Props = {
  trade: Trade
  index: number
  onChange: (next: Trade) => void
  onRemove: () => void
  removable: boolean
  excludedOfferedAcrossProposal: Set<string>
}

function labelForCode(
  code: string,
  name: string | null,
  t: ReturnType<typeof useT>,
): string {
  const num = Number(code.split('-')[1])
  const kind = stickerKind(num)
  if (kind === 'badge') return t('card.badge')
  if (kind === 'team_photo') return t('card.teamPhoto')
  return resolvePlayerLabel(code, name)
}

export function TradeRow({
  trade,
  index,
  onChange,
  onRemove,
  removable,
  excludedOfferedAcrossProposal,
}: Props) {
  const t = useT()
  const stickers = useStickersMap()
  const { incoming, outgoing } = useReservations()
  const [openPicker, setOpenPicker] = useState<'offered' | 'requested' | null>(null)

  const totalRequested = sumQty(trade.requested)
  const isNToOne = trade.offered.length > 1 || totalRequested === 1
  const canAddOffered = totalRequested === 1
  const canAddRequested =
    trade.offered.length === 1 && totalRequested < 5

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t('trade.row.title', { n: index + 1 })}
          </span>
          <RatioBadge trade={trade} />
        </div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-neutral-400 hover:text-rose-600"
            aria-label={t('trade.row.remove')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <section className="mb-3">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {t('trade.offer.label')}
        </h4>
        <div className="flex flex-wrap gap-2">
          {trade.offered.map((code) => {
            const teamCode = code.split('-')[0]
            const team = teamByCode(teamCode)
            const sticker = stickers.get(code)
            return (
              <span
                key={code}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs"
              >
                {team && <Flag code={team.code} className="h-3 w-4.5" />}
                <span>{code}</span>
                <span className="text-neutral-500">·</span>
                <span className="max-w-[140px] truncate">
                  {labelForCode(code, sticker?.name ?? null, t)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...trade,
                      offered: trade.offered.filter((c) => c !== code),
                    })
                  }
                  className="text-neutral-400 hover:text-rose-600"
                  aria-label={code}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )
          })}
          {(trade.offered.length === 0 || canAddOffered) && (
            <button
              type="button"
              onClick={() => setOpenPicker('offered')}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-3 py-1 text-xs text-neutral-600"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('trade.offer.add')}
            </button>
          )}
        </div>
        {trade.offered.length > 1 && (
          <p className="mt-2 text-[11px] text-neutral-500">
            {t('trade.offer.multiHint')}
          </p>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {t('trade.want.label', {
            total: totalRequested,
            max: trade.offered.length === 1 ? 5 : 1,
          })}
        </h4>
        <div className="flex flex-col gap-2">
          {trade.requested.map((r, ri) => {
            const teamCode = r.code.split('-')[0]
            const team = teamByCode(teamCode)
            const sticker = stickers.get(r.code)
            const available = availableSpare(
              sticker?.count ?? 0,
              outgoing.get(r.code) ?? 0,
            )
            const stepperLocked = isNToOne
            return (
              <div
                key={r.code}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
              >
                {team && <Flag code={team.code} className="h-4 w-6" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {labelForCode(r.code, sticker?.name ?? null, t)}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {r.code} · {t('trade.want.spareCount', { available })}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={stepperLocked || r.qty <= 1}
                    onClick={() =>
                      onChange({
                        ...trade,
                        requested: trade.requested.map((x, i) =>
                          i === ri ? { ...x, qty: Math.max(1, x.qty - 1) } : x,
                        ),
                      })
                    }
                    className="rounded p-1 text-neutral-500 disabled:opacity-30"
                    aria-label={t('trade.qty.dec')}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">{r.qty}</span>
                  <button
                    type="button"
                    disabled={
                      stepperLocked ||
                      totalRequested >= 5 ||
                      r.qty + 1 > available
                    }
                    onClick={() =>
                      onChange({
                        ...trade,
                        requested: trade.requested.map((x, i) =>
                          i === ri ? { ...x, qty: x.qty + 1 } : x,
                        ),
                      })
                    }
                    className="rounded p-1 text-neutral-500 disabled:opacity-30"
                    aria-label={t('trade.qty.inc')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...trade,
                      requested: trade.requested.filter((_, i) => i !== ri),
                    })
                  }
                  className="rounded p-1 text-neutral-400 hover:text-rose-600"
                  aria-label={t('trade.entry.remove')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
          {canAddRequested && (
            <button
              type="button"
              onClick={() => setOpenPicker('requested')}
              className="inline-flex items-center gap-1 self-start rounded-full border border-dashed border-neutral-300 px-3 py-1 text-xs text-neutral-600"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('trade.want.add')}
            </button>
          )}
        </div>
      </section>

      {openPicker === 'offered' && (
        <StickerPicker
          multiSelect
          title={t('picker.title.offer')}
          predicate={(code, count) =>
            count === 0 && (incoming.get(code) ?? 0) === 0
          }
          exclude={
            new Set([...trade.offered, ...excludedOfferedAcrossProposal])
          }
          onPickMany={(codes) => {
            onChange({ ...trade, offered: [...trade.offered, ...codes] })
            setOpenPicker(null)
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}

      {openPicker === 'requested' && (
        <StickerPicker
          multiSelect
          maxSelection={Math.max(0, 5 - totalRequested)}
          title={t('picker.title.want')}
          predicate={(code, count) => {
            if (count < 2) return false
            const out = outgoing.get(code) ?? 0
            return availableSpare(count, out) > 0
          }}
          exclude={new Set(trade.requested.map((r) => r.code))}
          onPickMany={(codes) => {
            onChange({
              ...trade,
              requested: [
                ...trade.requested,
                ...codes.map((code) => ({ code, qty: 1 })),
              ],
            })
            setOpenPicker(null)
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  )
}
