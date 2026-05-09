import { CheckSquare, ChevronLeft, X } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { StickerSheet } from '@/components/StickerSheet'
import { StickerTile } from '@/components/StickerTile'
import { Button } from '@/components/ui/button'
import { teamByCode } from '@/data/teams'
import { incrementMany, useTeamProgress } from '@/lib/state'

// Sticker layout that mirrors the printed album spread. In the physical
// album the team title sits on the left of row 1 and the group panel on
// the left of row 6, so stickers 1, 2 and 18, 19, 20 are right-aligned.
//   row 1:           1, 2 (top of left page, after team title block)
//   row 2: 3, 4, 5, 6
//   row 3: 7, 8, 9, 10
//   row 4: 11, 12, 13 (team photo, span 2 cols)
//   row 5: 14, 15, 16, 17
//   row 6:    18, 19, 20 (after group panel)
// `null` entries are intentional empty cells in the 4-col grid.
const ALBUM_LAYOUT: Array<number | null> = [
  null, null, 1, 2,
  3, 4, 5, 6,
  7, 8, 9, 10,
  11, 12, 13,
  14, 15, 16, 17,
  null, 18, 19, 20,
]

export function TeamDetail() {
  const { code = '' } = useParams<{ code: string }>()
  const upper = code.toUpperCase()
  const team = teamByCode(upper)
  const { have, total } = useTeamProgress(upper)
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (!team) return <Navigate to="/" replace />

  const enterSelect = () => {
    setSelected(new Set())
    setSelectMode(true)
  }

  const exitSelect = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const toggleSelect = (stickerCode: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(stickerCode)) next.delete(stickerCode)
      else next.add(stickerCode)
      return next
    })
  }

  const applyBulk = () => {
    if (selected.size === 0) {
      exitSelect()
      return
    }
    void incrementMany(Array.from(selected))
    exitSelect()
  }

  const headerStyle = { paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' } as const

  return (
    <div className="pb-24">
      {selectMode ? (
        <header
          className="sticky top-0 z-20 flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-3"
          style={headerStyle}
        >
          <button
            type="button"
            onClick={exitSelect}
            aria-label="Cancel selection"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="flex-1 text-sm font-medium text-neutral-900">
            {selected.size} selected
          </span>
          <Button
            type="button"
            size="sm"
            onClick={applyBulk}
            disabled={selected.size === 0}
          >
            +1 to all
          </Button>
        </header>
      ) : (
        <header
          className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-3"
          style={headerStyle}
        >
          <Link
            to="/"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Flag code={team.code} className="h-5 w-7" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold text-neutral-900">{team.name}</h1>
              <GroupPill group={team.group} />
            </div>
            <p className="text-xs tabular-nums text-neutral-500">
              {have}/{total} stickers
            </p>
          </div>
          <button
            type="button"
            onClick={enterSelect}
            aria-label="Select multiple stickers"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200"
          >
            <CheckSquare className="h-5 w-5" />
          </button>
        </header>
      )}

      <div className="grid grid-cols-4 gap-2 px-3 pt-4">
        {ALBUM_LAYOUT.map((slot, idx) => {
          if (slot === null) return <div key={`spacer-${idx}`} aria-hidden />
          const stickerCode = `${team.code}-${slot}`
          return (
            <StickerTile
              key={stickerCode}
              code={stickerCode}
              num={slot}
              onSelect={setOpenCode}
              selectMode={selectMode}
              selected={selected.has(stickerCode)}
              onToggleSelect={toggleSelect}
              wide={slot === 13}
            />
          )
        })}
      </div>

      <StickerSheet
        code={selectMode ? null : openCode}
        onClose={() => setOpenCode(null)}
      />
    </div>
  )
}
