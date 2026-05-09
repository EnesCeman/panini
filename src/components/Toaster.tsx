import { useToasts } from '@/lib/state'

export function Toaster() {
  const toasts = useToasts()
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto flex max-w-md flex-col gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 shadow"
          role="status"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
