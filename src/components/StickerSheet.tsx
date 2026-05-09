import { Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { stickerKind, teamByCode } from '@/data/teams'
import {
  decrementSticker,
  incrementSticker,
  setStickerName,
  useSticker,
} from '@/lib/state'

type Props = {
  code: string | null
  onClose: () => void
}

const KIND_LABEL: Record<ReturnType<typeof stickerKind>, string> = {
  badge: 'Team badge',
  team_photo: 'Team photo',
  player: 'Player',
}

export function StickerSheet({ code, onClose }: Props) {
  const open = code !== null
  const sticker = useSticker(code ?? '___')
  const [draftName, setDraftName] = useState('')

  useEffect(() => {
    if (code) setDraftName(sticker.name ?? '')
  }, [code, sticker.name])

  if (!code) {
    return (
      <Sheet open={false} onOpenChange={(v) => !v && onClose()}>
        <SheetContent />
      </Sheet>
    )
  }

  const [teamCode, numStr] = code.split('-')
  const num = Number(numStr)
  const team = teamByCode(teamCode)
  const kind = stickerKind(num)
  const allowName = kind === 'player'

  const commitName = () => {
    if (!code) return
    void setStickerName(code, draftName)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <div className="flex items-center gap-3 pt-2">
          {team && <Flag code={team.code} className="h-6 w-9" />}
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate">{code}</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {KIND_LABEL[kind]}
              {team ? ` · ${team.name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-neutral-100 p-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Decrement"
            disabled={sticker.count === 0}
            onClick={() => void decrementSticker(code)}
            className="h-12 w-12 rounded-full"
          >
            <Minus className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums text-neutral-900">
              {sticker.count}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500">
              {sticker.count === 0
                ? 'Missing'
                : sticker.count === 1
                  ? 'Have'
                  : `Have +${sticker.count - 1} extra`}
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            aria-label="Increment"
            onClick={() => void incrementSticker(code)}
            className="h-12 w-12 rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {allowName && (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Player name
            </label>
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              placeholder="Add a name"
              autoComplete="off"
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
