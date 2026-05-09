import { BookOpen, CircleDashed, Home, Inbox as InboxIcon, Layers } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useIsAdmin } from '@/lib/auth'
import { usePendingCount } from '@/lib/state'
import { cn } from '@/lib/utils'

const BASE_TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/cards', label: 'Cards', icon: BookOpen },
  { to: '/missing', label: 'Missing', icon: CircleDashed },
  { to: '/doubles', label: 'Duplicates', icon: Layers },
] as const

export function TabBar() {
  const admin = useIsAdmin()
  const pending = usePendingCount()
  const showInbox = admin.status === 'admin'

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-neutral-200 bg-white/90 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {BASE_TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-neutral-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.4]')} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
      {showInbox && (
        <NavLink
          to="/inbox"
          className={({ isActive }) =>
            cn(
              'relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-neutral-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <InboxIcon className={cn('h-5 w-5', isActive && 'stroke-[2.4]')} />
                {pending > 0 && (
                  <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {pending}
                  </span>
                )}
              </div>
              <span>Inbox</span>
            </>
          )}
        </NavLink>
      )}
    </nav>
  )
}
