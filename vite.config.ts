import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mirrors vercel.json rewrites in dev: any /market/* deep link serves
// market.html so tracking URLs like /market/p/<id> survive full page reloads.
function marketSpaRewrite() {
  return {
    name: 'market-spa-rewrite',
    configureServer(server: {
      middlewares: {
        use: (
          fn: (
            req: { url?: string },
            _res: unknown,
            next: () => void,
          ) => void,
        ) => void
      }
    }) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        if (/^\/market(\/|$|\?)/.test(url) && !url.startsWith('/market.html')) {
          const queryIndex = url.indexOf('?')
          const search = queryIndex >= 0 ? url.slice(queryIndex) : ''
          req.url = `/market.html${search}`
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), marketSpaRewrite()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        market: path.resolve(__dirname, 'market.html'),
      },
    },
  },
})
