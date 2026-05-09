import { GROUPS, TEAMS } from '@/data/teams'
import { GroupPill } from './GroupPill'
import { TeamRow } from './TeamRow'

type Props = {
  dense?: boolean
}

export function GroupSection({ dense = false }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map((group) => {
        const teams = TEAMS.filter((t) => t.group === group)
        return (
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
        )
      })}
    </div>
  )
}
