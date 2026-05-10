import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from '@/components/TabBar'
import { Toaster } from '@/components/Toaster'
import { useIsAdmin } from '@/lib/auth'
import { subscribePublicLocks, syncLocksToFirestore } from '@/lib/locks'
import { PublicLocaleProvider } from '@/lib/publicI18n'
import { subscribeStickers } from '@/lib/state'
import { subscribeSubmissions } from '@/lib/submissions'
import { subscribeTrades, useTrades } from '@/lib/trades'
import { Cards } from '@/pages/Cards'
import { Doubles } from '@/pages/Doubles'
import { Home } from '@/pages/Home'
import { Inbox } from '@/pages/inbox/Inbox'
import { Missing } from '@/pages/Missing'
import { PublicLanding } from '@/pages/PublicLanding'
import { TeamDetail } from '@/pages/TeamDetail'
import { TradeDetail } from '@/pages/trading/TradeDetail'
import { Trading } from '@/pages/trading/Trading'

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
  const isAdmin = adminCheck.status === 'admin'

  useEffect(() => {
    const unsub = subscribeStickers()
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    const unsub = subscribeSubmissions()
    return () => unsub()
  }, [isAdmin])

  // Admin needs the trades collection in scope so the lock-sync
  // effect (below) can recompute meta/locks; non-admins read meta/locks
  // directly via subscribePublicLocks for the visitor flow.
  useEffect(() => {
    if (!isAdmin) return
    const unsub = subscribeTrades()
    return () => unsub()
  }, [isAdmin])

  useEffect(() => {
    const unsub = subscribePublicLocks()
    return () => unsub()
  }, [])

  const trades = useTrades()
  useEffect(() => {
    if (!isAdmin) return
    void syncLocksToFirestore(trades.values())
  }, [isAdmin, trades])

  if (adminCheck.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  if (!isAdmin && !onInbox) {
    return (
      <PublicLocaleProvider>
        <Toaster />
        <PublicLanding />
      </PublicLocaleProvider>
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
          <Route path="/trading" element={<Trading />} />
          <Route path="/trading/:id" element={<TradeDetail />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </BrowserRouter>
  )
}
