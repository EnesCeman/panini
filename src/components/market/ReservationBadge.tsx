import { cn } from '@/lib/utils'

type Props = {
  kind: 'incoming' | 'all-reserved' | 'partial-reserved'
  reserved?: number
  className?: string
}

export function ReservationBadge({ kind, reserved, className }: Props) {
  const label =
    kind === 'incoming'
      ? `incoming${reserved && reserved > 1 ? ` ×${reserved}` : ''}`
      : kind === 'all-reserved'
        ? 'all reserved'
        : `${reserved ?? 0} reserved`
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800',
        className,
      )}
    >
      {label}
    </span>
  )
}
