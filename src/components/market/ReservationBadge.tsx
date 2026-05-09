import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Props = {
  kind: 'incoming' | 'all-reserved' | 'partial-reserved'
  reserved?: number
  className?: string
}

export function ReservationBadge({ kind, reserved, className }: Props) {
  const t = useT()
  const label =
    kind === 'incoming'
      ? reserved && reserved > 1
        ? t('badge.incomingMulti', { count: reserved })
        : t('badge.incoming')
      : kind === 'all-reserved'
        ? t('badge.allReserved')
        : t('badge.partialReserved', { count: reserved ?? 0 })
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
