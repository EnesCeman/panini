import { usePublicLocale } from '@/lib/publicI18n'
import { cn } from '@/lib/utils'

export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale } = usePublicLocale()
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'bs' ? 'en' : 'bs')}
      className={cn(
        'inline-flex h-7 items-center rounded-md border border-neutral-200 bg-white px-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-700',
        className,
      )}
      aria-label="Toggle language"
    >
      {locale === 'bs' ? 'EN' : 'BS'}
    </button>
  )
}
