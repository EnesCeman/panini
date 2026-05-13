import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProgressBar } from './ProgressBar'
import { Flag } from './Flag'
import { useTeamMissing, useTeamProgress } from '@/lib/state'
import { cn } from '@/lib/utils'
import { groupColor } from '@/lib/groupColors'
import type { Team } from '@/data/teams'

type Props = {
  team: Team
  dense?: boolean
}

export function TeamRow({ team, dense = false }: Props) {
  const { have, total } = useTeamProgress(team.code)
  const missing = useTeamMissing(team.code)
  const c = groupColor(team.group)
  return (
    <Link
      to={`/team/${team.code}`}
      className={cn(
        'flex items-center gap-3 rounded-lg border-l-4 bg-white px-3 shadow-sm transition active:scale-[0.99] active:bg-neutral-50',
        c.border,
        dense ? 'min-h-[56px] py-2' : 'min-h-[64px] py-2.5',
      )}
    >
      <Flag code={team.code} className="h-5 w-7" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-neutral-900">{team.name}</span>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-500">
            {have}/{total}
          </span>
        </div>
        <ProgressBar value={have} max={total} className="mt-1.5 h-1.5" />
        {missing.length > 0 && (
          <div className="mt-1 text-[10px] leading-snug text-neutral-500">
            {missing.join(', ')}
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
    </Link>
  )
}
