import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from '@/components/TabBar'
import { Toaster } from '@/components/Toaster'
import { subscribeStickers } from '@/lib/state'
import { Doubles } from '@/pages/Doubles'
import { Home } from '@/pages/Home'
import { Missing } from '@/pages/Missing'
import { TeamDetail } from '@/pages/TeamDetail'
import { Teams } from '@/pages/Teams'

export default function App() {
  useEffect(() => {
    return subscribeStickers()
  }, [])

  return (
    <BrowserRouter>
      <div className="mx-auto min-h-dvh max-w-md bg-neutral-50">
        <Toaster />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/team/:code" element={<TeamDetail />} />
          <Route path="/missing" element={<Missing />} />
          <Route path="/doubles" element={<Doubles />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </BrowserRouter>
  )
}
