import type { ReactNode } from 'react'
import { signInWithGoogle, useIsAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { NotAuthorized } from './NotAuthorized'

type Props = { children: ReactNode }

export function AuthGate({ children }: Props) {
  const check = useIsAdmin()

  if (check.status === 'loading') {
    return <div className="px-6 py-8 text-center text-sm text-neutral-500">Loading…</div>
  }
  if (check.status === 'not-signed-in') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Admin sign-in required</h1>
        <Button type="button" onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </Button>
      </div>
    )
  }
  if (check.status === 'not-admin') {
    return <NotAuthorized uid={check.uid} />
  }
  return <>{children}</>
}
