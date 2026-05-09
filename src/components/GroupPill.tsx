import { cn } from '@/lib/utils'
import { groupColor } from '@/lib/groupColors'

type Props = {
  group: string
  className?: string
}

export function GroupPill({ group, className }: Props) {
  const c = groupColor(group)
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white',
        c.bg,
        className,
      )}
    >
      {group}
    </span>
  )
}
