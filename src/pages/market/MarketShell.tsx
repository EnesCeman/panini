import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LangToggle } from '@/components/LangToggle'
import { useT } from '@/lib/i18n'

type Props = { children: ReactNode }

export function MarketShell({ children }: Props) {
  const t = useT()
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-neutral-50 md:max-w-5xl">
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 pb-3 md:px-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <Link
          to="/market"
          className="flex min-w-0 flex-col leading-tight text-neutral-900"
        >
          <span className="truncate text-base font-semibold">
            {t('shell.brand')}
          </span>
          <span className="truncate text-[11px] font-normal text-neutral-500">
            {t('shell.subtitle')}
          </span>
        </Link>
        <LangToggle className="shrink-0" />
      </header>
      <main className="pb-24">{children}</main>
    </div>
  )
}
