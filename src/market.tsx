import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import { Toaster } from '@/components/Toaster'
import { LocaleProvider } from '@/lib/i18n'
import { subscribeProposals, subscribeStickers } from '@/lib/state'
import { Browse } from '@/pages/market/Browse'
import { MarketShell } from '@/pages/market/MarketShell'
import { NewProposal } from '@/pages/market/NewProposal'
import { ProposalTracking } from '@/pages/market/ProposalTracking'
import './index.css'

function MarketApp() {
  useEffect(() => {
    const unsubStickers = subscribeStickers()
    const unsubProposals = subscribeProposals()
    return () => {
      unsubStickers()
      unsubProposals()
    }
  }, [])

  return (
    <LocaleProvider>
      <BrowserRouter>
        <Toaster />
        <MarketShell>
          <Routes>
            <Route path="/market" element={<Browse />} />
            <Route path="/market/new" element={<NewProposal />} />
            <Route path="/market/p/:id" element={<ProposalTracking />} />
            <Route path="*" element={<Navigate to="/market" replace />} />
          </Routes>
        </MarketShell>
      </BrowserRouter>
    </LocaleProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MarketApp />
  </StrictMode>,
)
