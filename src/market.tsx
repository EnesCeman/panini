import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="mx-auto max-w-md p-6 text-neutral-900">
      <h1 className="text-xl font-semibold">Marketplace (placeholder)</h1>
      <p className="mt-2 text-sm text-neutral-600">Wired up later.</p>
    </div>
  </StrictMode>,
)
