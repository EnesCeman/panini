import { AuthGate } from '@/components/AuthGate'
import { SignInButton } from '@/components/SignInButton'

export function Inbox() {
  return (
    <AuthGate>
      <InboxView />
    </AuthGate>
  )
}

function InboxView() {
  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">Inbox</h1>
          <SignInButton />
        </div>
      </header>

      <p className="px-4 pt-12 text-center text-sm text-neutral-500">
        Submissions will appear here once the new public list is wired up.
      </p>
    </div>
  )
}
