import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stickerKind } from '@/data/teams'
import { useSticker } from '@/lib/state'

type Props = {
  code: string
  num: number
  onSelect: (code: string) => void
}

export function StickerTile({ code, num, onSelect }: Props) {
  const sticker = useSticker(code)
  const kind = stickerKind(num)
  const owned = sticker.count >= 1
  const extras = sticker.count >= 2

  const label =
    kind === 'badge'
      ? 'BADGE'
      : kind === 'team_photo'
        ? 'PHOTO'
        : sticker.name && sticker.name.length > 0
          ? sticker.name
          : code

  return (
    <button
      type="button"
      onClick={() => onSelect(code)}
      aria-label={`Sticker ${code}, count ${sticker.count}`}
      className={cn(
        'group relative flex aspect-[3/4] flex-col items-center justify-center rounded-lg border p-1.5 text-center transition active:scale-95',
        !owned && 'border-neutral-200 bg-neutral-100 text-neutral-400',
        owned && !extras && 'border-emerald-300 bg-emerald-50 text-emerald-900',
        extras && 'border-amber-300 bg-amber-50 text-amber-900',
      )}
    >
      <span
        className={cn(
          'absolute left-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
          !owned && 'bg-neutral-300 text-neutral-700',
          owned && !extras && 'bg-emerald-600 text-white',
          extras && 'bg-amber-600 text-white',
        )}
      >
        {num}
      </span>
      {owned && !extras && (
        <Check className="absolute right-1 top-1 h-4 w-4 text-emerald-600" />
      )}
      {extras && (
        <span className="absolute bottom-1 right-1 inline-flex h-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-white">
          x{sticker.count}
        </span>
      )}
      <span
        className={cn(
          'mt-3 line-clamp-2 break-words px-1 text-[11px] font-medium leading-tight',
          (kind === 'badge' || kind === 'team_photo') && 'tracking-wide text-[10px]',
        )}
      >
        {label}
      </span>
    </button>
  )
}
