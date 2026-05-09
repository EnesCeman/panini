import { FIFA_TO_ISO } from '@/lib/flagIso'
import { cn } from '@/lib/utils'

type Props = {
  code: string
  className?: string
}

export function Flag({ code, className }: Props) {
  const iso = FIFA_TO_ISO[code]
  if (!iso) return null
  return (
    <span
      aria-hidden
      className={cn(
        'fi inline-block flex-shrink-0 rounded-sm shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]',
        `fi-${iso}`,
        className,
      )}
    />
  )
}
