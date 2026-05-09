import { cn } from '@/lib/utils'

export type SearchMode = 'name' | 'code'

type Props = {
  mode: SearchMode
  onChange: (m: SearchMode) => void
  className?: string
}

export function SearchModeToggle({ mode, onChange, className }: Props) {
  return (
    <div
      className={cn(
        'inline-flex overflow-hidden rounded-md border border-neutral-200 text-[11px] font-medium',
        className,
      )}
    >
      {(['name', 'code'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'px-2 py-1',
            mode === m ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600',
          )}
        >
          {m === 'name' ? 'Name' : 'Code'}
        </button>
      ))}
    </div>
  )
}
