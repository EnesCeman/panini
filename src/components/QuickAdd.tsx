import { Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { TeamCombo } from '@/components/TeamCombo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      <TeamCombo
        value={team}
        onChange={(code) => {
          setTeam(code)
          numRef.current?.focus()
        }}
        className="min-w-0 flex-1"
      />
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
