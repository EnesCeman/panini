import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from '@/components/TabBar'
import { Toaster } from '@/components/Toaster'
import { useIsAdmin } from '@/lib/auth'
import { subscribeProposals, subscribeStickers } from '@/lib/state'
import { Cards } from '@/pages/Cards'
import { Doubles } from '@/pages/Doubles'
import { Home } from '@/pages/Home'
import { Inbox } from '@/pages/inbox/Inbox'
import { Missing } from '@/pages/Missing'
import { TeamDetail } from '@/pages/TeamDetail'

export default function App() {
  const adminCheck = useIsAdmin()

  useEffect(() => {
    const unsubStickers = subscribeStickers()
    const unsubProposals = subscribeProposals()
    return () => {
      unsubStickers()
      unsubProposals()
    }
  }, [])

  useEffect(() => {
    if (
      adminCheck.status === 'not-signed-in' ||
      adminCheck.status === 'not-admin'
    ) {
      window.location.replace('/market')
    }
  }, [adminCheck])

  if (adminCheck.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  if (adminCheck.status !== 'admin') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-neutral-500">
        Redirecting to marketplace…
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
