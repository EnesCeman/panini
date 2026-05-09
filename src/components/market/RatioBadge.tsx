import { cn } from '@/lib/utils'
import { sumQty, type Trade } from '@/lib/proposalSchema'
import { validateTrade } from '@/lib/proposalSchema'

type Props = { trade: Trade; className?: string }

export function RatioBadge({ trade, className }: Props) {
  const offered = trade.offered.length
  const requested = sumQty(trade.requested)
  const valid = validateTrade(trade).ok
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
        valid
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-rose-100 text-rose-800',
        className,
      )}
    >
      {offered} : {requested}
    </span>
  )
}
