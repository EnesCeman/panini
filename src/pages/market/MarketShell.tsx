import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = { children: ReactNode }

export function MarketShell({ children }: Props) {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-neutral-50 md:max-w-5xl">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 pb-3 md:px-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <Link to="/market" className="text-base font-semibold text-neutral-900">
          Sticker Swap
        </Link>
      </header>
      <main className="pb-24">{children}</main>
    </div>
  )
}
