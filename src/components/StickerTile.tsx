import { Check, Minus, Plus } from 'lucide-react'
import type { MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import { stickerKind } from '@/data/teams'
import { decrementSticker, incrementSticker, useSticker } from '@/lib/state'

type Props = {
  code: string
  num: number
  onSelect: (code: string) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (code: string) => void
  wide?: boolean
}

export function StickerTile({
  code,
  num,
  onSelect,
  selectMode = false,
  selected = false,
  onToggleSelect,
  wide = false,
}: Props) {
  const sticker = useSticker(code)
  const kind = stickerKind(num)
  const owned = sticker.count >= 1
  const extras = sticker.count >= 2

  const label =
    kind === 'badge'
      ? 'BADGE'
      : kind === 'team_photo'
        ? 'TEAM PHOTO'
        : sticker.name && sticker.name.length > 0
          ? sticker.name
          : code

  const stop = (e: MouseEvent) => {
    e.stopPropagation()
  }

  const handleBody = () => {
    if (selectMode) onToggleSelect?.(code)
    else onSelect(code)
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border text-center transition',
        wide ? 'col-span-2 aspect-[8/5]' : 'aspect-[4/5]',
        !owned && 'border-neutral-200 bg-neutral-100 text-neutral-400',
        owned && !extras && 'border-emerald-300 bg-emerald-50 text-emerald-900',
        extras && 'border-amber-300 bg-amber-50 text-amber-900',
        selected && 'ring-2 ring-primary ring-offset-1',
      )}
    >
      <button
        type="button"
        onClick={handleBody}
        aria-label={
          selectMode
            ? `${selected ? 'Deselect' : 'Select'} sticker ${code}`
            : `Sticker ${code}, count ${sticker.count}, open editor`
        }
        aria-pressed={selectMode ? selected : undefined}
        className="flex flex-1 flex-col items-center justify-center px-1.5 pt-1.5 transition active:scale-[0.97]"
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
        {selectMode && selected ? (
          <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </span>
        ) : (
          extras && (
            <span className="absolute right-1 top-1 inline-flex h-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-white">
              x{sticker.count}
            </span>
          )
        )}
        <span
          className={cn(
            'mt-2 line-clamp-2 break-words px-1 text-[11px] font-medium leading-tight',
            (kind === 'badge' || kind === 'team_photo') && 'tracking-wide text-[10px]',
          )}
        >
          {label}
        </span>
      </button>
      {!selectMode && (
        <div className="flex h-10 border-t border-current/10">
          <button
            type="button"
            aria-label={`Decrement ${code}`}
            disabled={sticker.count === 0}
            onClick={(e) => {
              stop(e)
              void decrementSticker(code)
            }}
            className="flex flex-1 items-center justify-center border-r border-current/10 transition active:bg-black/5 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Increment ${code}`}
            onClick={(e) => {
              stop(e)
              void incrementSticker(code)
            }}
            className="flex flex-1 items-center justify-center transition active:bg-black/5"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
