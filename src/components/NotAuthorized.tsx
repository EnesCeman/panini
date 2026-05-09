import { SignInButton } from './SignInButton'

type Props = { uid?: string }

export function NotAuthorized({ uid }: Props) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold text-neutral-900">Not authorized</h1>
      <p className="text-sm text-neutral-600">
        Your Google account isn't on the admin list.
      </p>
      {uid && (
        <p className="break-all rounded bg-neutral-100 px-3 py-2 text-[11px] text-neutral-700">
          UID: {uid}
        </p>
      )}
      <p className="text-xs text-neutral-500">
        Send the UID above to an existing admin to be added.
      </p>
      <SignInButton />
    </div>
  )
}
