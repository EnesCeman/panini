import { Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GROUPS, TEAMS } from '@/data/teams'
import { incrementSticker } from '@/lib/state'

export function QuickAdd() {
  const [team, setTeam] = useState('')
  const [num, setNum] = useState('')
  const numRef = useRef<HTMLInputElement>(null)

  const parsedNum = Number(num)
  const valid = team.length > 0 && num.length > 0 && parsedNum >= 1 && parsedNum <= 20

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    void incrementSticker(`${team}-${parsedNum}`)
    setNum('')
    numRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="flex items-stretch gap-2">
      <select
        value={team}
        onChange={(e) => setTeam(e.target.value)}
        aria-label="Team"
        className="flex h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Team…</option>
        {GROUPS.map((g) => (
          <optgroup key={g} label={`Group ${g}`}>
            {TEAMS.filter((t) => t.group === g).map((t) => (
              <option key={t.code} value={t.code}>
                {t.name} ({t.code})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <Input
        ref={numRef}
        type="number"
        inputMode="numeric"
        min={1}
        max={20}
        placeholder="#"
        value={num}
        onChange={(e) => setNum(e.target.value)}
        aria-label="Sticker number"
        className="w-16 text-center"
      />
      <Button type="submit" disabled={!valid} aria-label="Add one" className="px-3">
        <Plus className="h-4 w-4" />
        <span className="ml-1 text-sm">1</span>
      </Button>
    </form>
  )
}
