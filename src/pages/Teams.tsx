import { useState } from 'react'
import { GroupSection } from '@/components/GroupSection'
import { SearchBar } from '@/components/SearchBar'

export function Teams() {
  const [query, setQuery] = useState('')
  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      <header className="sticky top-0 z-20 -mx-4 -mt-4 flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-4 pb-3 pt-4">
        <h1 className="text-lg font-semibold text-neutral-900">Teams</h1>
        <SearchBar value={query} onChange={setQuery} placeholder="Search by team name or code" />
      </header>
      <GroupSection dense query={query} />
    </div>
  )
}
