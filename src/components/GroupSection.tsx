import { GROUPS, TEAMS } from '@/data/teams'
import { GroupPill } from './GroupPill'
import { TeamRow } from './TeamRow'

type Props = {
  dense?: boolean
  query?: string
}

export function GroupSection({ dense = false, query = '' }: Props) {
  const q = query.trim().toLowerCase()
  const groups = GROUPS.map((group) => ({
    group,
    teams: TEAMS.filter(
      (t) =>
        t.group === group &&
        (q.length === 0 ||
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q)),
    ),
  })).filter((g) => g.teams.length > 0)

  if (groups.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
        No teams match
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ group, teams }) => (
        <section key={group}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <GroupPill group={group} />
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Group {group}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {teams.map((t) => (
              <TeamRow key={t.code} team={t} dense={dense} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
