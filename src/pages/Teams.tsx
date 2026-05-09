import { GroupSection } from '@/components/GroupSection'

export function Teams() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      <header className="sticky top-0 -mx-4 -mt-4 border-b border-neutral-200 bg-neutral-50/80 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold text-neutral-900">Teams</h1>
      </header>
      <GroupSection dense />
    </div>
  )
}
