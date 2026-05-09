import { cn } from '@/lib/utils'

type Props = {
  value: number
  max: number
  className?: string
  barClassName?: string
}

export function ProgressBar({ value, max, className, barClassName }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-neutral-200', className)}>
      <div
        className={cn('h-full rounded-full bg-emerald-500 transition-[width] duration-300', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
