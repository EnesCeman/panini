import { useLocale, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const LABELS: Record<Locale, string> = {
  en: 'EN',
  bs: 'BS',
}

export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()
  return (
    <div
      className={cn(
        'inline-flex overflow-hidden rounded-md border border-neutral-200 text-[11px] font-medium',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {(['en', 'bs'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            'px-2 py-1',
            locale === l ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600',
          )}
          aria-pressed={locale === l}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  )
}
