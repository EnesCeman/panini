import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { StickerSheet } from '@/components/StickerSheet'
import { StickerTile } from '@/components/StickerTile'
import { teamByCode } from '@/data/teams'
import { useTeamProgress } from '@/lib/state'

export function TeamDetail() {
  const { code = '' } = useParams<{ code: string }>()
  const upper = code.toUpperCase()
  const team = teamByCode(upper)
  const { have, total } = useTeamProgress(upper)
  const [openCode, setOpenCode] = useState<string | null>(null)

  if (!team) return <Navigate to="/teams" replace />

  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-neutral-50/85 px-3 py-3 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <Link
          to="/teams"
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
      </header>

      <div className="grid grid-cols-4 gap-2 px-3 pt-4">
        {Array.from({ length: 20 }, (_, i) => {
          const num = i + 1
          const stickerCode = `${team.code}-${num}`
          return (
            <StickerTile
              key={stickerCode}
              code={stickerCode}
              num={num}
              onSelect={setOpenCode}
            />
          )
        })}
      </div>

      <StickerSheet code={openCode} onClose={() => setOpenCode(null)} />
    </div>
  )
}
