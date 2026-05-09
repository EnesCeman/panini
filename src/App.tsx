import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from '@/components/TabBar'
import { Toaster } from '@/components/Toaster'
import { useIsAdmin } from '@/lib/auth'
import { subscribeStickers } from '@/lib/state'
import { Cards } from '@/pages/Cards'
import { Doubles } from '@/pages/Doubles'
import { Home } from '@/pages/Home'
import { Inbox } from '@/pages/inbox/Inbox'
import { Missing } from '@/pages/Missing'
import { TeamDetail } from '@/pages/TeamDetail'

function getPath(): string {
  return typeof window !== 'undefined' ? window.location.pathname : '/'
}

function isInboxPath(path: string): boolean {
  return path === '/inbox' || path.startsWith('/inbox/')
}

export default function App() {
  const adminCheck = useIsAdmin()
  const path = getPath()
  const onInbox = isInboxPath(path)

  useEffect(() => {
    const unsub = subscribeStickers()
    return () => {
      unsub()
    }
  }, [])

  if (adminCheck.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  if (adminCheck.status !== 'admin' && !onInbox) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-neutral-50 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-neutral-900">
            Sticker swap is being rebuilt
          </h1>
          <p className="text-sm text-neutral-600">
            Check back soon — a simpler version is on the way.
          </p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="mx-auto min-h-dvh max-w-md bg-neutral-50">
        <Toaster />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/team/:code" element={<TeamDetail />} />
          <Route path="/missing" element={<Missing />} />
          <Route path="/doubles" element={<Doubles />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/players" element={<Navigate to="/cards" replace />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </BrowserRouter>
  )
}
