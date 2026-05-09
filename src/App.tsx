import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from '@/components/TabBar'
import { Toaster } from '@/components/Toaster'
import { subscribeProposals, subscribeStickers } from '@/lib/state'
import { Doubles } from '@/pages/Doubles'
import { Home } from '@/pages/Home'
import { Missing } from '@/pages/Missing'
import { Players } from '@/pages/Players'
import { TeamDetail } from '@/pages/TeamDetail'

export default function App() {
  useEffect(() => {
    const unsubStickers = subscribeStickers()
    const unsubProposals = subscribeProposals()
    return () => {
      unsubStickers()
      unsubProposals()
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="mx-auto min-h-dvh max-w-md bg-neutral-50">
        <Toaster />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/team/:code" element={<TeamDetail />} />
          <Route path="/missing" element={<Missing />} />
          <Route path="/doubles" element={<Doubles />} />
          <Route path="/players" element={<Players />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </BrowserRouter>
  )
}
