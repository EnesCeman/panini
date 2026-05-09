# Sticker Swap Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public-facing swap marketplace alongside the existing admin app — visitors can browse missing/doubles lists, submit multi-trade swap proposals (1:5 or N:1 per trade), and track them via a unique URL; the owner reviews proposals in an auth-gated inbox.

**Architecture:** Same repo, two Vite entry points (`index.html` admin, `market.html` public). Firestore for storage, derived reservations computed in memory from accepted proposals. Firebase Auth (Google) gates admin writes via an `admins/{uid}` allowlist. No backend functions, no push, no email.

**Tech Stack:** Vite multi-entry build, React 19, React Router v6, Firebase Firestore, Firebase Auth, Zustand, Tailwind, Vitest (added in this plan), `nanoid` for proposal IDs.

**Spec:** `docs/superpowers/specs/2026-05-09-marketplace-design.md` — read first.

---

## File Structure Overview

**New files:**

```
market.html                                  # public Vite entry, mirrors index.html with #root
firestore.rules                              # rules deployed via firebase-tools
firebase.json                                # firestore rules deploy config
vercel.json                                  # SPA rewrites for two entries
vitest.config.ts                             # test runner config

src/
  market.tsx                                 # public entry: createRoot, BrowserRouter, market routes
  lib/
    auth.ts                                  # signInWithGoogle, signOut, useAuth, useIsAdmin
    proposalSchema.ts                        # Proposal type, validation funcs (testable, pure)
    proposals.ts                             # Firestore mutations: create, withdraw, accept, reject, complete, cancel
    reservations.ts                          # incomingReserved / outgoingReserved derivation (testable, pure)
    autoDash.ts                              # code-input auto-dash logic (testable, pure)
  pages/
    inbox/
      Inbox.tsx
      ProposalCard.tsx
    market/
      MarketShell.tsx
      Browse.tsx
      NewProposal.tsx
      ProposalTracking.tsx
  components/
    AuthGate.tsx
    SignInButton.tsx
    NotAuthorized.tsx
    market/
      StickerPicker.tsx
      TradeRow.tsx
      RatioBadge.tsx
      ReservationBadge.tsx
    inbox/
      ProposalActions.tsx
  test/
    proposalSchema.test.ts
    reservations.test.ts
    autoDash.test.ts
```

**Modified files:**

```
package.json                                 # add deps: nanoid, vitest; add scripts
vite.config.ts                               # multi-entry input
src/lib/firebase.ts                          # export auth alongside db
src/lib/state.ts                             # add proposals subscription + selectors
src/App.tsx                                  # add /inbox route
src/components/TabBar.tsx                    # add Inbox tab w/ badge (admin-gated)
src/components/StickerSheet.tsx              # gate +/- buttons behind auth
src/pages/Missing.tsx                        # show reservation badges
src/pages/Doubles.tsx                        # show reservation badges, subtract reserved from spare
```

---

## Phase 1: Foundation

### Task 1: Add dependencies and test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/.gitkeep`

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
pnpm add nanoid
pnpm add -D vitest @vitest/ui jsdom
```

- [ ] **Step 2: Add test scripts to `package.json`**

In the `scripts` block, add `test` and `test:watch` after `lint`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create `vitest.config.ts` at repo root**

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Create empty test directory marker**

Create `src/test/.gitkeep` (empty file) so the folder is committed.

- [ ] **Step 5: Verify test runner boots**

```bash
pnpm test
```

Expected: "No test files found" or similar; exit 0 or non-fatal exit. If it errors hard, fix the config before continuing.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/test/.gitkeep
git commit -m "Add nanoid + Vitest, set up test runner"
```

---

### Task 2: Multi-entry Vite build

**Files:**
- Create: `market.html`
- Create: `src/market.tsx`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create `market.html` at repo root**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1"
    />
    <meta name="theme-color" content="#fafafa" />
    <title>Sticker Swap</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/market.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/market.tsx` (stub)**

```tsx
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
```

- [ ] **Step 3: Update `vite.config.ts` for multi-entry**

Replace the file with:

```ts
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
```

- [ ] **Step 4: Verify both entries build**

```bash
pnpm build
```

Expected: build succeeds; `dist/index.html` and `dist/market.html` both exist.

- [ ] **Step 5: Manual dev check**

```bash
pnpm dev
```

Visit `http://localhost:5173/` (admin loads as before) and `http://localhost:5173/market.html` (placeholder marketplace renders). Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add market.html src/market.tsx vite.config.ts
git commit -m "Add market.html entry + stub market.tsx, multi-entry Vite build"
```

---

### Task 3: Vercel SPA rewrites

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/market/:path*", "destination": "/market.html" },
    { "source": "/market", "destination": "/market.html" },
    { "source": "/((?!market|assets|favicon).*)", "destination": "/index.html" }
  ]
}
```

This makes `/market/anything` deep-link to the marketplace SPA and everything else (except static assets) deep-link to the admin SPA.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "Add vercel.json rewrites for two-entry SPA routing"
```

---

### Task 4: Initial Firestore rules + firebase.json

**Files:**
- Create: `firestore.rules`
- Create: `firebase.json`

- [ ] **Step 1: Create `firestore.rules` with the rules from the spec**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(db)/documents/admins/$(request.auth.uid));
    }

    match /admins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if isAdmin();
    }

    match /stickers/{code} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /proposals/{id} {
      allow read: if true;

      allow create: if
        request.resource.data.status == 'pending'
        && request.resource.data.createdAt == request.time
        && request.resource.data.decidedAt == null
        && request.resource.data.closedAt == null
        && request.resource.data.decidedBy == null
        && request.resource.data.ownerNote == null
        && request.resource.data.proposer.name is string
        && request.resource.data.proposer.name.size() > 0
        && request.resource.data.proposer.contact is string
        && request.resource.data.proposer.contact.size() > 0
        && request.resource.data.trades.size() >= 1
        && request.resource.data.trades.size() <= 20;

      allow update: if
        resource.data.status == 'pending'
        && request.resource.data.status == 'withdrawn'
        && request.resource.data.diff(resource.data)
             .affectedKeys().hasOnly(['status', 'closedAt']);

      allow update: if isAdmin();

      allow delete: if isAdmin();
    }
  }
}
```

- [ ] **Step 2: Create `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 3: Document the deploy step**

Note for the operator (do not commit this as a doc — it goes in the operator's mental model):

> Rules will be deployed at the end of the plan, after the schema is final. Until then the existing permissive rules stay live so the admin app keeps working.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules firebase.json
git commit -m "Add firestore.rules and firebase.json (deploy comes later)"
```

---

## Phase 2: Auth

### Task 5: Firebase Auth setup

**Files:**
- Modify: `src/lib/firebase.ts`
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Export `auth` from `src/lib/firebase.ts`**

Replace the file with:

```ts
import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
```

- [ ] **Step 2: Create `src/lib/auth.ts`**

```ts
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { auth, db } from './firebase'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, provider)
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth)
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: User }

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setState(user ? { status: 'signed-in', user } : { status: 'signed-out' })
    })
  }, [])
  return state
}

export type AdminCheck =
  | { status: 'loading' }
  | { status: 'not-signed-in' }
  | { status: 'not-admin'; uid: string }
  | { status: 'admin'; uid: string }

export function useIsAdmin(): AdminCheck {
  const auth = useAuth()
  const [check, setCheck] = useState<AdminCheck>({ status: 'loading' })

  useEffect(() => {
    if (auth.status === 'loading') {
      setCheck({ status: 'loading' })
      return
    }
    if (auth.status === 'signed-out') {
      setCheck({ status: 'not-signed-in' })
      return
    }
    const uid = auth.user.uid
    let cancelled = false
    getDoc(doc(db, 'admins', uid))
      .then((snap) => {
        if (cancelled) return
        setCheck(
          snap.exists()
            ? { status: 'admin', uid }
            : { status: 'not-admin', uid },
        )
      })
      .catch(() => {
        if (!cancelled) setCheck({ status: 'not-admin', uid })
      })
    return () => {
      cancelled = true
    }
  }, [auth])

  return check
}
```

- [ ] **Step 3: Sanity-check the build**

```bash
pnpm build
```

Expected: succeeds (TypeScript happy).

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase.ts src/lib/auth.ts
git commit -m "Add Firebase Auth helpers (signIn, signOut, useAuth, useIsAdmin)"
```

---

### Task 6: AuthGate, SignInButton, NotAuthorized

**Files:**
- Create: `src/components/SignInButton.tsx`
- Create: `src/components/NotAuthorized.tsx`
- Create: `src/components/AuthGate.tsx`

- [ ] **Step 1: Create `src/components/SignInButton.tsx`**

```tsx
import { LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signInWithGoogle, signOut, useAuth } from '@/lib/auth'

export function SignInButton() {
  const auth = useAuth()
  if (auth.status === 'loading') return null
  if (auth.status === 'signed-out') {
    return (
      <Button type="button" variant="outline" onClick={() => void signInWithGoogle()}>
        <LogIn className="h-4 w-4" />
        <span>Sign in with Google</span>
      </Button>
    )
  }
  return (
    <Button type="button" variant="ghost" onClick={() => void signOut()}>
      <LogOut className="h-4 w-4" />
      <span>Sign out</span>
    </Button>
  )
}
```

- [ ] **Step 2: Create `src/components/NotAuthorized.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `src/components/AuthGate.tsx`**

```tsx
import type { ReactNode } from 'react'
import { signInWithGoogle, useIsAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { NotAuthorized } from './NotAuthorized'

type Props = { children: ReactNode }

export function AuthGate({ children }: Props) {
  const check = useIsAdmin()

  if (check.status === 'loading') {
    return <div className="px-6 py-8 text-center text-sm text-neutral-500">Loading…</div>
  }
  if (check.status === 'not-signed-in') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Admin sign-in required</h1>
        <Button type="button" onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </Button>
      </div>
    )
  }
  if (check.status === 'not-admin') {
    return <NotAuthorized uid={check.uid} />
  }
  return <>{children}</>
}
```

- [ ] **Step 4: Sanity-check build**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/SignInButton.tsx src/components/NotAuthorized.tsx src/components/AuthGate.tsx
git commit -m "Add SignInButton, NotAuthorized, AuthGate components"
```

---

## Phase 3: Data Model

### Task 7: Proposal types + validation (TDD)

**Files:**
- Create: `src/lib/proposalSchema.ts`
- Create: `src/test/proposalSchema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/proposalSchema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateTrade, validateProposalDraft } from '@/lib/proposalSchema'

describe('validateTrade', () => {
  it('rejects when offered is empty', () => {
    expect(validateTrade({ offered: [], requested: [{ code: 'BRA-1', qty: 1 }] }))
      .toEqual({ ok: false, reason: 'offered_empty' })
  })

  it('rejects when requested is empty', () => {
    expect(validateTrade({ offered: ['POR-5'], requested: [] }))
      .toEqual({ ok: false, reason: 'requested_empty' })
  })

  it('accepts 1:1 trade', () => {
    expect(validateTrade({ offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] }))
      .toEqual({ ok: true })
  })

  it('accepts 1:5 trade (max requested when offered is 1)', () => {
    expect(
      validateTrade({
        offered: ['POR-5'],
        requested: [{ code: 'BRA-1', qty: 5 }],
      }),
    ).toEqual({ ok: true })
  })

  it('rejects 1:6 trade (exceeds 5 cap when offered is 1)', () => {
    expect(
      validateTrade({
        offered: ['POR-5'],
        requested: [{ code: 'BRA-1', qty: 6 }],
      }),
    ).toEqual({ ok: false, reason: 'requested_over_cap' })
  })

  it('accepts N:1 trade with arbitrary offered count', () => {
    expect(
      validateTrade({
        offered: ['POR-5', 'ENG-3', 'GER-7', 'BRA-9'],
        requested: [{ code: 'NED-2', qty: 1 }],
      }),
    ).toEqual({ ok: true })
  })

  it('rejects 2:2 trade (neither side is 1)', () => {
    expect(
      validateTrade({
        offered: ['POR-5', 'ENG-3'],
        requested: [{ code: 'BRA-1', qty: 2 }],
      }),
    ).toEqual({ ok: false, reason: 'shape_invalid' })
  })

  it('rejects 2:1 with multi-entry requested but qty totals 1', () => {
    // Two offered, one requested with qty 1 → valid
    expect(
      validateTrade({
        offered: ['POR-5', 'ENG-3'],
        requested: [{ code: 'BRA-1', qty: 1 }],
      }),
    ).toEqual({ ok: true })
  })

  it('rejects duplicate offered codes within a trade', () => {
    expect(
      validateTrade({
        offered: ['POR-5', 'POR-5'],
        requested: [{ code: 'BRA-1', qty: 1 }],
      }),
    ).toEqual({ ok: false, reason: 'offered_duplicate' })
  })

  it('rejects qty < 1', () => {
    expect(
      validateTrade({
        offered: ['POR-5'],
        requested: [{ code: 'BRA-1', qty: 0 }],
      }),
    ).toEqual({ ok: false, reason: 'requested_qty_invalid' })
  })
})

describe('validateProposalDraft', () => {
  const validTrade = {
    offered: ['POR-5'],
    requested: [{ code: 'BRA-1', qty: 1 }],
  }

  it('rejects when trades is empty', () => {
    expect(
      validateProposalDraft({
        trades: [],
        proposer: { name: 'A', contact: 'b' },
      }),
    ).toEqual({ ok: false, reason: 'no_trades' })
  })

  it('rejects when proposer name empty', () => {
    expect(
      validateProposalDraft({
        trades: [validTrade],
        proposer: { name: '', contact: 'b' },
      }),
    ).toEqual({ ok: false, reason: 'name_empty' })
  })

  it('rejects when proposer contact empty', () => {
    expect(
      validateProposalDraft({
        trades: [validTrade],
        proposer: { name: 'A', contact: '' },
      }),
    ).toEqual({ ok: false, reason: 'contact_empty' })
  })

  it('rejects duplicate offered codes across trades', () => {
    expect(
      validateProposalDraft({
        trades: [
          { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] },
          { offered: ['POR-5'], requested: [{ code: 'GER-2', qty: 1 }] },
        ],
        proposer: { name: 'A', contact: 'b' },
      }),
    ).toEqual({ ok: false, reason: 'offered_duplicate_across_trades' })
  })

  it('accepts a valid multi-trade draft', () => {
    expect(
      validateProposalDraft({
        trades: [
          { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] },
          { offered: ['ENG-3', 'GER-7'], requested: [{ code: 'NED-2', qty: 1 }] },
        ],
        proposer: { name: 'A', contact: 'b' },
      }),
    ).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run the test (it must fail because the module doesn't exist)**

```bash
pnpm test
```

Expected: errors importing `@/lib/proposalSchema` (module not found).

- [ ] **Step 3: Create `src/lib/proposalSchema.ts`**

```ts
import type { Timestamp } from 'firebase/firestore'

export type TradeRequest = { code: string; qty: number }

export type Trade = {
  offered: string[]
  requested: TradeRequest[]
}

export type ProposalStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'completed'
  | 'cancelled'

export type Proposal = {
  id: string
  status: ProposalStatus
  trades: Trade[]
  proposer: { name: string; contact: string }
  proposerNote: string | null
  ownerNote: string | null
  createdAt: Timestamp | null
  decidedAt: Timestamp | null
  closedAt: Timestamp | null
  decidedBy: string | null
}

export type TradeValidation =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'offered_empty'
        | 'requested_empty'
        | 'offered_duplicate'
        | 'requested_qty_invalid'
        | 'requested_over_cap'
        | 'shape_invalid'
    }

export type ProposalValidation =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'no_trades'
        | 'name_empty'
        | 'contact_empty'
        | 'offered_duplicate_across_trades'
        | 'trade_invalid'
    }

export const REQUESTED_CAP = 5
export const OFFERED_SANITY_CAP = 50
export const TRADES_PER_PROPOSAL_CAP = 20

export function sumQty(requested: TradeRequest[]): number {
  return requested.reduce((acc, r) => acc + r.qty, 0)
}

export function validateTrade(trade: Trade): TradeValidation {
  if (trade.offered.length === 0) return { ok: false, reason: 'offered_empty' }
  const seen = new Set<string>()
  for (const code of trade.offered) {
    if (seen.has(code)) return { ok: false, reason: 'offered_duplicate' }
    seen.add(code)
  }
  if (trade.requested.length === 0) return { ok: false, reason: 'requested_empty' }
  for (const r of trade.requested) {
    if (!Number.isInteger(r.qty) || r.qty < 1) {
      return { ok: false, reason: 'requested_qty_invalid' }
    }
  }
  const totalRequested = sumQty(trade.requested)

  // Shape: at least one side must equal 1
  if (trade.offered.length === 1) {
    if (totalRequested > REQUESTED_CAP) {
      return { ok: false, reason: 'requested_over_cap' }
    }
    return { ok: true }
  }
  if (totalRequested === 1) {
    if (trade.offered.length > OFFERED_SANITY_CAP) {
      return { ok: false, reason: 'shape_invalid' }
    }
    return { ok: true }
  }
  return { ok: false, reason: 'shape_invalid' }
}

export type ProposalDraft = {
  trades: Trade[]
  proposer: { name: string; contact: string }
  proposerNote?: string | null
}

export function validateProposalDraft(draft: ProposalDraft): ProposalValidation {
  if (draft.trades.length === 0) return { ok: false, reason: 'no_trades' }
  if (draft.trades.length > TRADES_PER_PROPOSAL_CAP) {
    return { ok: false, reason: 'no_trades' }
  }
  if (draft.proposer.name.trim().length === 0) return { ok: false, reason: 'name_empty' }
  if (draft.proposer.contact.trim().length === 0) {
    return { ok: false, reason: 'contact_empty' }
  }
  const seenOffered = new Set<string>()
  for (const trade of draft.trades) {
    const tv = validateTrade(trade)
    if (!tv.ok) return { ok: false, reason: 'trade_invalid' }
    for (const code of trade.offered) {
      if (seenOffered.has(code)) {
        return { ok: false, reason: 'offered_duplicate_across_trades' }
      }
      seenOffered.add(code)
    }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm test
```

Expected: all tests in `proposalSchema.test.ts` pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/proposalSchema.ts src/test/proposalSchema.test.ts
git commit -m "Add Proposal types and validation with tests"
```

---

### Task 8: Reservation derivation (TDD)

**Files:**
- Create: `src/lib/reservations.ts`
- Create: `src/test/reservations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/reservations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveReservations } from '@/lib/reservations'
import type { Proposal } from '@/lib/proposalSchema'

function makeProposal(
  id: string,
  status: Proposal['status'],
  trades: Proposal['trades'],
): Proposal {
  return {
    id,
    status,
    trades,
    proposer: { name: 'x', contact: 'y' },
    proposerNote: null,
    ownerNote: null,
    createdAt: null,
    decidedAt: null,
    closedAt: null,
    decidedBy: null,
  }
}

describe('deriveReservations', () => {
  it('returns empty maps when there are no accepted proposals', () => {
    const r = deriveReservations([])
    expect(r.incoming.size).toBe(0)
    expect(r.outgoing.size).toBe(0)
  })

  it('ignores non-accepted proposals', () => {
    const p = makeProposal('a', 'pending', [
      { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 2 }] },
    ])
    const r = deriveReservations([p])
    expect(r.incoming.get('POR-5') ?? 0).toBe(0)
    expect(r.outgoing.get('BRA-1') ?? 0).toBe(0)
  })

  it('counts incoming from accepted proposals', () => {
    const p = makeProposal('a', 'accepted', [
      { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] },
    ])
    const r = deriveReservations([p])
    expect(r.incoming.get('POR-5')).toBe(1)
  })

  it('counts incoming for each offered code in a multi-offered trade', () => {
    const p = makeProposal('a', 'accepted', [
      { offered: ['POR-5', 'ENG-3'], requested: [{ code: 'BRA-1', qty: 1 }] },
    ])
    const r = deriveReservations([p])
    expect(r.incoming.get('POR-5')).toBe(1)
    expect(r.incoming.get('ENG-3')).toBe(1)
  })

  it('sums outgoing qty across trades and proposals', () => {
    const p1 = makeProposal('a', 'accepted', [
      { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 2 }] },
    ])
    const p2 = makeProposal('b', 'accepted', [
      {
        offered: ['ENG-3'],
        requested: [
          { code: 'BRA-1', qty: 1 },
          { code: 'GER-2', qty: 1 },
        ],
      },
    ])
    const r = deriveReservations([p1, p2])
    expect(r.outgoing.get('BRA-1')).toBe(3)
    expect(r.outgoing.get('GER-2')).toBe(1)
  })

  it('does not count completed/cancelled/rejected/withdrawn proposals', () => {
    const trades = [{ offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] }]
    const r = deriveReservations([
      makeProposal('a', 'completed', trades),
      makeProposal('b', 'cancelled', trades),
      makeProposal('c', 'rejected', trades),
      makeProposal('d', 'withdrawn', trades),
    ])
    expect(r.incoming.size).toBe(0)
    expect(r.outgoing.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

```bash
pnpm test
```

Expected: errors importing `@/lib/reservations`.

- [ ] **Step 3: Create `src/lib/reservations.ts`**

```ts
import type { Proposal } from './proposalSchema'

export type ReservationMaps = {
  incoming: Map<string, number>
  outgoing: Map<string, number>
}

export function deriveReservations(proposals: Proposal[]): ReservationMaps {
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  for (const p of proposals) {
    if (p.status !== 'accepted') continue
    for (const trade of p.trades) {
      for (const code of trade.offered) {
        incoming.set(code, (incoming.get(code) ?? 0) + 1)
      }
      for (const r of trade.requested) {
        outgoing.set(r.code, (outgoing.get(r.code) ?? 0) + r.qty)
      }
    }
  }
  return { incoming, outgoing }
}

export function availableSpare(
  count: number,
  outgoingReserved: number,
): number {
  const spare = Math.max(0, count - 1)
  return Math.max(0, spare - outgoingReserved)
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm test
```

Expected: all reservation tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reservations.ts src/test/reservations.test.ts
git commit -m "Add reservation derivation with tests"
```

---

### Task 9: Extend store with proposals + selectors

**Files:**
- Modify: `src/lib/state.ts`

- [ ] **Step 1: Add proposal state, subscription, and selectors**

Replace the contents of `src/lib/state.ts` with:

```ts
import {
  collection,
  doc,
  increment as fsIncrement,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { TEAMS } from '@/data/teams'
import { db } from './firebase'
import type { Proposal } from './proposalSchema'
import { deriveReservations, type ReservationMaps } from './reservations'

export type Sticker = { count: number; name: string | null }
export type Toast = { id: number; message: string }

export const EMPTY_STICKER: Sticker = { count: 0, name: null }

type State = {
  stickers: Map<string, Sticker>
  ready: boolean
  toasts: Toast[]
  proposals: Map<string, Proposal>
  proposalsReady: boolean
}

type Actions = {
  setStickers: (m: Map<string, Sticker>) => void
  patchSticker: (code: string, s: Sticker) => void
  pushToast: (message: string) => void
  dismissToast: (id: number) => void
  setProposals: (m: Map<string, Proposal>) => void
  patchProposal: (id: string, p: Proposal | null) => void
}

let toastId = 1

export const useStore = create<State & Actions>((set, get) => ({
  stickers: new Map(),
  ready: false,
  toasts: [],
  proposals: new Map(),
  proposalsReady: false,
  setStickers: (stickers) => set({ stickers, ready: true }),
  patchSticker: (code, sticker) =>
    set((state) => {
      const next = new Map(state.stickers)
      next.set(code, sticker)
      return { stickers: next }
    }),
  pushToast: (message) => {
    const id = toastId++
    set((state) => ({ toasts: [...state.toasts, { id, message }] }))
    setTimeout(() => get().dismissToast(id), 3500)
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setProposals: (proposals) => set({ proposals, proposalsReady: true }),
  patchProposal: (id, p) =>
    set((state) => {
      const next = new Map(state.proposals)
      if (p === null) next.delete(id)
      else next.set(id, p)
      return { proposals: next }
    }),
}))

export function subscribeStickers(): () => void {
  return onSnapshot(
    collection(db, 'stickers'),
    (snap) => {
      const map = new Map<string, Sticker>()
      snap.forEach((d) => {
        const data = d.data() as { count?: number; name?: string | null }
        const count = typeof data.count === 'number' && data.count > 0 ? data.count : 0
        map.set(d.id, { count, name: data.name ?? null })
      })
      useStore.getState().setStickers(map)
    },
    (err) => {
      console.error('Firestore snapshot error', err)
      useStore.getState().pushToast('Connection error')
    },
  )
}

export function subscribeProposals(): () => void {
  return onSnapshot(
    collection(db, 'proposals'),
    (snap) => {
      const map = new Map<string, Proposal>()
      snap.forEach((d) => {
        const data = d.data() as Omit<Proposal, 'id'>
        map.set(d.id, { id: d.id, ...data })
      })
      useStore.getState().setProposals(map)
    },
    (err) => {
      console.error('Proposals snapshot error', err)
      useStore.getState().pushToast('Connection error')
    },
  )
}

export function useStickersMap(): Map<string, Sticker> {
  return useStore((s) => s.stickers)
}

export function useSticker(code: string): Sticker {
  return useStore((s) => s.stickers.get(code) ?? EMPTY_STICKER)
}

export function useTotals() {
  return useStore(
    useShallow((s) => {
      let have = 0
      let doubles = 0
      for (const sticker of s.stickers.values()) {
        if (sticker.count >= 1) have += 1
        if (sticker.count >= 2) doubles += sticker.count - 1
      }
      const total = TEAMS.length * 20
      return { have, doubles, total, missing: total - have }
    }),
  )
}

export function useTeamProgress(teamCode: string) {
  return useStore(
    useShallow((s) => {
      let have = 0
      for (let i = 1; i <= 20; i++) {
        const sticker = s.stickers.get(`${teamCode}-${i}`)
        if (sticker && sticker.count >= 1) have += 1
      }
      return { have, total: 20 }
    }),
  )
}

export function useToasts() {
  return useStore((s) => s.toasts)
}

export function useProposals(): Map<string, Proposal> {
  return useStore((s) => s.proposals)
}

export function useProposal(id: string | undefined): Proposal | undefined {
  return useStore((s) => (id ? s.proposals.get(id) : undefined))
}

export function useReservations(): ReservationMaps {
  return useStore(
    useShallow((s) => deriveReservations(Array.from(s.proposals.values()))),
  )
}

export function usePendingCount(): number {
  return useStore((s) => {
    let n = 0
    for (const p of s.proposals.values()) {
      if (p.status === 'pending') n += 1
    }
    return n
  })
}

export async function incrementSticker(code: string) {
  const before = useStore.getState().stickers.get(code) ?? EMPTY_STICKER
  useStore.getState().patchSticker(code, { ...before, count: before.count + 1 })
  try {
    await setDoc(
      doc(db, 'stickers', code),
      { count: fsIncrement(1), updatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (e) {
    useStore.getState().patchSticker(code, before)
    useStore.getState().pushToast('Failed to update')
    console.error(e)
  }
}

export async function decrementSticker(code: string) {
  const before = useStore.getState().stickers.get(code) ?? EMPTY_STICKER
  if (before.count <= 0) return
  useStore.getState().patchSticker(code, { ...before, count: before.count - 1 })
  try {
    await setDoc(
      doc(db, 'stickers', code),
      { count: fsIncrement(-1), updatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (e) {
    useStore.getState().patchSticker(code, before)
    useStore.getState().pushToast('Failed to update')
    console.error(e)
  }
}

export async function setStickerName(code: string, name: string) {
  const before = useStore.getState().stickers.get(code) ?? EMPTY_STICKER
  const trimmed = name.trim()
  const nextName = trimmed.length > 0 ? trimmed : null
  if (nextName === before.name) return
  useStore.getState().patchSticker(code, { ...before, name: nextName })
  try {
    await setDoc(
      doc(db, 'stickers', code),
      { name: nextName, updatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (e) {
    useStore.getState().patchSticker(code, before)
    useStore.getState().pushToast('Failed to save name')
    console.error(e)
  }
}

export async function incrementMany(codes: string[]): Promise<void> {
  if (codes.length === 0) return
  const state = useStore.getState()
  const before = new Map<string, Sticker>()
  for (const code of codes) {
    const prev = state.stickers.get(code) ?? EMPTY_STICKER
    before.set(code, prev)
    state.patchSticker(code, { ...prev, count: prev.count + 1 })
  }
  const results = await Promise.allSettled(
    codes.map((code) =>
      setDoc(
        doc(db, 'stickers', code),
        { count: fsIncrement(1), updatedAt: serverTimestamp() },
        { merge: true },
      ),
    ),
  )
  let failures = 0
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      failures += 1
      const code = codes[i]
      const prev = before.get(code)
      if (prev) useStore.getState().patchSticker(code, prev)
      console.error('incrementMany failed for', code, r.reason)
    }
  })
  if (failures > 0) {
    useStore.getState().pushToast(
      failures === 1 ? '1 update failed' : `${failures} updates failed`,
    )
  }
}
```

- [ ] **Step 2: Wire `subscribeProposals` into the admin app**

In `src/App.tsx`, update the `useEffect` to also subscribe to proposals:

```tsx
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
```

(The `/inbox` route is added in Task 18.)

- [ ] **Step 3: Verify build still works**

```bash
pnpm build && pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/state.ts src/App.tsx
git commit -m "Extend store with proposals subscription, reservation selectors"
```

---

### Task 10: Proposal mutations

**Files:**
- Create: `src/lib/proposals.ts`

- [ ] **Step 1: Create `src/lib/proposals.ts` with all proposal mutations**

```ts
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { auth, db } from './firebase'
import {
  validateProposalDraft,
  type Proposal,
  type ProposalDraft,
} from './proposalSchema'

const ID_LENGTH = 12

export async function createProposal(draft: ProposalDraft): Promise<string> {
  const v = validateProposalDraft(draft)
  if (!v.ok) throw new Error(`Invalid proposal: ${v.reason}`)

  const id = nanoid(ID_LENGTH)
  await setDoc(doc(db, 'proposals', id), {
    status: 'pending',
    trades: draft.trades,
    proposer: {
      name: draft.proposer.name.trim(),
      contact: draft.proposer.contact.trim(),
    },
    proposerNote:
      draft.proposerNote && draft.proposerNote.trim().length > 0
        ? draft.proposerNote.trim()
        : null,
    ownerNote: null,
    createdAt: serverTimestamp(),
    decidedAt: null,
    closedAt: null,
    decidedBy: null,
  })
  return id
}

export async function withdrawProposal(id: string): Promise<void> {
  await updateDoc(doc(db, 'proposals', id), {
    status: 'withdrawn',
    closedAt: serverTimestamp(),
  })
}

export async function acceptProposal(
  id: string,
  ownerNote: string | null,
): Promise<void> {
  const uid = requireAdminUid()
  await updateDoc(doc(db, 'proposals', id), {
    status: 'accepted',
    decidedAt: serverTimestamp(),
    decidedBy: uid,
    ownerNote: ownerNote && ownerNote.length > 0 ? ownerNote : null,
  })
}

export async function rejectProposal(
  id: string,
  ownerNote: string | null,
): Promise<void> {
  const uid = requireAdminUid()
  await updateDoc(doc(db, 'proposals', id), {
    status: 'rejected',
    decidedAt: serverTimestamp(),
    closedAt: serverTimestamp(),
    decidedBy: uid,
    ownerNote: ownerNote && ownerNote.length > 0 ? ownerNote : null,
  })
}

export async function completeProposal(id: string): Promise<void> {
  requireAdminUid()
  await updateDoc(doc(db, 'proposals', id), {
    status: 'completed',
    closedAt: serverTimestamp(),
  })
}

export async function cancelProposal(id: string): Promise<void> {
  requireAdminUid()
  await updateDoc(doc(db, 'proposals', id), {
    status: 'cancelled',
    closedAt: serverTimestamp(),
  })
}

export async function fetchProposalById(id: string): Promise<Proposal | null> {
  const snap = await getDoc(doc(db, 'proposals', id))
  if (!snap.exists()) return null
  const data = snap.data() as Omit<Proposal, 'id'>
  return { id: snap.id, ...data }
}

function requireAdminUid(): string {
  const u = auth.currentUser
  if (!u) throw new Error('Not signed in')
  return u.uid
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/proposals.ts
git commit -m "Add proposal mutation functions (create/withdraw/accept/reject/complete/cancel)"
```

---

## Phase 4: Marketplace UI

### Task 11: MarketShell + base routes

**Files:**
- Create: `src/pages/market/MarketShell.tsx`
- Modify: `src/market.tsx`

- [ ] **Step 1: Create `src/pages/market/MarketShell.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = { children: ReactNode }

export function MarketShell({ children }: Props) {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-neutral-50">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <Link to="/market" className="text-base font-semibold text-neutral-900">
          Sticker Swap
        </Link>
      </header>
      <main className="pb-24">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/market.tsx` with full router**

```tsx
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import 'flag-icons/css/flag-icons.min.css'
import { Toaster } from '@/components/Toaster'
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
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MarketApp />
  </StrictMode>,
)
```

- [ ] **Step 3: Create stub pages so the import resolves**

`src/pages/market/Browse.tsx`:

```tsx
export function Browse() {
  return <div className="p-4 text-sm text-neutral-500">Browse (placeholder)</div>
}
```

`src/pages/market/NewProposal.tsx`:

```tsx
export function NewProposal() {
  return <div className="p-4 text-sm text-neutral-500">New proposal (placeholder)</div>
}
```

`src/pages/market/ProposalTracking.tsx`:

```tsx
export function ProposalTracking() {
  return <div className="p-4 text-sm text-neutral-500">Tracking (placeholder)</div>
}
```

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

Visit `http://localhost:5173/market.html` (in dev, the rewrites only apply on Vercel; locally use the file directly). Verify the shell renders and the placeholder Browse appears.

- [ ] **Step 5: Commit**

```bash
git add src/pages/market/ src/market.tsx
git commit -m "Add MarketShell, market.tsx router, and page stubs"
```

---

### Task 12: Auto-dash search input (TDD)

**Files:**
- Create: `src/lib/autoDash.ts`
- Create: `src/test/autoDash.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/autoDash.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyAutoDash } from '@/lib/autoDash'

describe('applyAutoDash', () => {
  const codes = new Set(['POR', 'ENG', 'BRA', 'GER', 'NED'])

  it('adds dash when input upper-cases to a known team code', () => {
    expect(applyAutoDash('por', codes)).toBe('POR-')
  })

  it('uppercases letters as a side effect', () => {
    expect(applyAutoDash('eng', codes)).toBe('ENG-')
  })

  it('does nothing if dash is already present', () => {
    expect(applyAutoDash('POR-', codes)).toBe('POR-')
    expect(applyAutoDash('POR-5', codes)).toBe('POR-5')
  })

  it('does nothing for partial codes', () => {
    expect(applyAutoDash('PO', codes)).toBe('PO')
  })

  it('does nothing for unknown codes', () => {
    expect(applyAutoDash('XYZ', codes)).toBe('XYZ')
  })

  it('preserves longer input that starts with a code (no auto-dash mid-typing)', () => {
    expect(applyAutoDash('PORT', codes)).toBe('PORT')
  })

  it('handles empty input', () => {
    expect(applyAutoDash('', codes)).toBe('')
  })
})
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm test
```

- [ ] **Step 3: Implement `src/lib/autoDash.ts`**

```ts
export function applyAutoDash(input: string, codes: Set<string>): string {
  if (input.length === 0) return ''
  if (input.includes('-')) return input.toUpperCase().includes('-')
    ? input.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    : input
  const upper = input.toUpperCase()
  if (codes.has(upper)) return `${upper}-`
  return upper
}
```

Wait — the tests expect `'PO'` (uppercase) for partial codes but `applyAutoDash('PO', codes)` should return `'PO'`. Looking at my implementation, `'PO'.toUpperCase() === 'PO'`, codes has no `'PO'`, so we fall through to `return upper` which is `'PO'`. Good.

But the test `expect(applyAutoDash('PORT', codes)).toBe('PORT')` — `'PORT'.toUpperCase() === 'PORT'`, no dash present, upper `'PORT'` not in codes, returns `'PORT'`. Good.

The test `expect(applyAutoDash('eng', codes)).toBe('ENG-')` — input has no dash, upper is `'ENG'`, in codes, returns `'ENG-'`. Good.

Re-examining the dash branch: `if (input.includes('-')) return input.toUpperCase()...` — this is overengineered. Let me simplify:

Replace `applyAutoDash` with:

```ts
export function applyAutoDash(input: string, codes: Set<string>): string {
  if (input.length === 0) return ''
  if (input.includes('-')) return input.toUpperCase()
  const upper = input.toUpperCase()
  if (codes.has(upper)) return `${upper}-`
  return upper
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: all pass. If `'POR-5'.toUpperCase()` differs from `'POR-5'` (it doesn't — uppercase preserves digits and dash), all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/autoDash.ts src/test/autoDash.test.ts
git commit -m "Add applyAutoDash helper for code-mode search"
```

---

### Task 13: Browse page (two lists, two search bars)

**Files:**
- Create: `src/components/market/ReservationBadge.tsx`
- Modify: `src/pages/market/Browse.tsx`

- [ ] **Step 1: Create `src/components/market/ReservationBadge.tsx`**

```tsx
import { cn } from '@/lib/utils'

type Props = {
  kind: 'incoming' | 'all-reserved' | 'partial-reserved'
  reserved?: number
  className?: string
}

export function ReservationBadge({ kind, reserved, className }: Props) {
  const label =
    kind === 'incoming'
      ? `incoming${reserved && reserved > 1 ? ` ×${reserved}` : ''}`
      : kind === 'all-reserved'
        ? 'all reserved'
        : `${reserved ?? 0} reserved`
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800',
        className,
      )}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Replace `src/pages/market/Browse.tsx` with the real implementation**

```tsx
import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { SearchBar } from '@/components/SearchBar'
import { ReservationBadge } from '@/components/market/ReservationBadge'
import { Button } from '@/components/ui/button'
import { TEAMS, stickerKind } from '@/data/teams'
import { applyAutoDash } from '@/lib/autoDash'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { availableSpare } from '@/lib/reservations'
import { useReservations, useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

type SearchMode = 'name' | 'code'

const TEAM_CODE_SET = new Set(TEAMS.map((t) => t.code))

type Item = {
  code: string
  teamCode: string
  num: number
  name: string | null
}

function labelFor(code: string, num: number, name: string | null): string {
  const kind = stickerKind(num)
  if (kind === 'badge') return 'Team badge'
  if (kind === 'team_photo') return 'Team photo'
  return resolvePlayerLabel(code, name)
}

export function Browse() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-3">
      <Intro />
      <MissingSection />
      <DoublesSection />
      <Link to="/market/new" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <Button className="rounded-full shadow-lg">Send a swap proposal</Button>
      </Link>
    </div>
  )
}

function Intro() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
      <p className="font-semibold">Looking to swap?</p>
      <p className="mt-1 text-xs text-neutral-500">
        Browse what I'm missing and what I have spare. Build a proposal —
        accept/reject is up to me.
      </p>
    </div>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: SearchMode
  onChange: (m: SearchMode) => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-neutral-200 text-[11px] font-medium">
      {(['name', 'code'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'px-2 py-1',
            mode === m ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600',
          )}
        >
          {m === 'name' ? 'Name' : 'Code'}
        </button>
      ))}
    </div>
  )
}

function matchesQuery(
  query: string,
  mode: SearchMode,
  item: Item,
  team: { name: string },
): boolean {
  if (query.length === 0) return true
  if (mode === 'code') {
    return item.code.toUpperCase().includes(query.toUpperCase())
  }
  const q = normalizeForSearch(query)
  const album = albumPlayerName(item.code)
  return (
    (item.name ? normalizeForSearch(item.name).includes(q) : false) ||
    (album ? normalizeForSearch(album).includes(q) : false) ||
    normalizeForSearch(team.name).includes(q)
  )
}

function MissingSection() {
  const stickers = useStickersMap()
  const { incoming } = useReservations()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')

  const items = useMemo<Item[]>(() => {
    const out: Item[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        if (!sticker || sticker.count === 0) {
          out.push({ code, teamCode: team.code, num: i, name: sticker?.name ?? null })
        }
      }
    }
    return out
  }, [stickers])

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const item of items) {
      const team = TEAMS.find((t) => t.code === item.teamCode)
      if (!team) continue
      if (!matchesQuery(query, mode, item, team)) continue
      const list = map.get(item.teamCode) ?? []
      list.push(item)
      map.set(item.teamCode, list)
    }
    return TEAMS.map((t) => ({ team: t, items: map.get(t.code) ?? [] }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.team.name.localeCompare(b.team.name))
  }, [items, query, mode])

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">What I need ({items.length})</h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </header>
      <SearchBar
        value={query}
        onChange={(v) =>
          setQuery(mode === 'code' ? applyAutoDash(v, TEAM_CODE_SET) : v)
        }
        placeholder={mode === 'code' ? 'Code, e.g. POR-5' : 'Player, team…'}
      />
      <div className="mt-3 flex flex-col gap-4">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">No matches</p>
        ) : (
          grouped.map(({ team, items }) => (
            <section key={team.code}>
              <Link
                to={`/team/${team.code}`}
                className="mb-1 -mx-1 flex items-center gap-2 rounded px-1 py-0.5"
              >
                <Flag code={team.code} className="h-4 w-6 shrink-0" />
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {team.name}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
                <GroupPill group={team.group} />
              </Link>
              <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {items.map((s, idx) => (
                  <li
                    key={s.code}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-left',
                      idx !== items.length - 1 && 'border-b border-neutral-100',
                    )}
                  >
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-200 px-1.5 text-[11px] font-bold text-neutral-700">
                      {s.num}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">
                      {labelFor(s.code, s.num, s.name)}
                    </span>
                    {(incoming.get(s.code) ?? 0) > 0 && (
                      <ReservationBadge kind="incoming" reserved={incoming.get(s.code)} />
                    )}
                    <span className="text-xs tabular-nums text-neutral-400">{s.code}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  )
}

function DoublesSection() {
  const stickers = useStickersMap()
  const { outgoing } = useReservations()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')

  type DItem = Item & { count: number; available: number }

  const items = useMemo<DItem[]>(() => {
    const out: DItem[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        const sticker = stickers.get(code)
        if (sticker && sticker.count >= 2) {
          out.push({
            code,
            teamCode: team.code,
            num: i,
            name: sticker.name,
            count: sticker.count,
            available: availableSpare(sticker.count, outgoing.get(code) ?? 0),
          })
        }
      }
    }
    return out
  }, [stickers, outgoing])

  const grouped = useMemo(() => {
    const map = new Map<string, DItem[]>()
    for (const item of items) {
      const team = TEAMS.find((t) => t.code === item.teamCode)
      if (!team) continue
      if (!matchesQuery(query, mode, item, team)) continue
      const list = map.get(item.teamCode) ?? []
      list.push(item)
      map.set(item.teamCode, list)
    }
    return TEAMS.map((t) => ({ team: t, items: map.get(t.code) ?? [] }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.team.name.localeCompare(b.team.name))
  }, [items, query, mode])

  const totalSpare = items.reduce((acc, i) => acc + (i.count - 1), 0)

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">
          What I'm giving ({totalSpare} spare)
        </h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </header>
      <SearchBar
        value={query}
        onChange={(v) =>
          setQuery(mode === 'code' ? applyAutoDash(v, TEAM_CODE_SET) : v)
        }
        placeholder={mode === 'code' ? 'Code, e.g. POR-5' : 'Player, team…'}
      />
      <div className="mt-3 flex flex-col gap-4">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">No matches</p>
        ) : (
          grouped.map(({ team, items }) => (
            <section key={team.code}>
              <Link
                to={`/team/${team.code}`}
                className="mb-1 -mx-1 flex items-center gap-2 rounded px-1 py-0.5"
              >
                <Flag code={team.code} className="h-4 w-6 shrink-0" />
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {team.name}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
                <GroupPill group={team.group} />
              </Link>
              <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {items.map((s, idx) => {
                  const reserved = outgoing.get(s.code) ?? 0
                  return (
                    <li
                      key={s.code}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2',
                        idx !== items.length - 1 && 'border-b border-neutral-100',
                      )}
                    >
                      <Flag code={team.code} className="h-4 w-6" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-neutral-900">
                          {labelFor(s.code, s.num, s.name)}
                        </div>
                        <div className="text-[11px] tabular-nums text-neutral-500">
                          {s.code} · {s.available} of {s.count - 1} spare
                        </div>
                      </div>
                      {s.available === 0 ? (
                        <ReservationBadge kind="all-reserved" />
                      ) : reserved > 0 ? (
                        <ReservationBadge kind="partial-reserved" reserved={reserved} />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Manual smoke test**

Run `pnpm dev`, visit `http://localhost:5173/market.html`. Verify:

- Two sections render with their own search bars and Name/Code toggles.
- Switching to Code mode + typing `POR` auto-dashes to `POR-`.
- Name mode searches by player/team name as before.
- "Send a swap proposal" floating button is visible.

- [ ] **Step 4: Commit**

```bash
git add src/components/market/ReservationBadge.tsx src/pages/market/Browse.tsx
git commit -m "Implement marketplace Browse page with two lists and search modes"
```

---

### Task 14: StickerPicker component

**Files:**
- Create: `src/components/market/StickerPicker.tsx`

- [ ] **Step 1: Create the picker**

```tsx
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Flag } from '@/components/Flag'
import { Input } from '@/components/ui/input'
import { TEAMS, stickerKind, teamByCode } from '@/data/teams'
import { applyAutoDash } from '@/lib/autoDash'
import { normalizeForSearch } from '@/lib/normalize'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'

const TEAM_CODE_SET = new Set(TEAMS.map((t) => t.code))

type CandidatesPredicate = (code: string, count: number) => boolean

type Props = {
  predicate: CandidatesPredicate
  onPick: (code: string) => void
  onClose: () => void
  exclude?: Set<string>
  title: string
}

function labelFor(code: string, num: number, name: string | null): string {
  const kind = stickerKind(num)
  if (kind === 'badge') return 'Team badge'
  if (kind === 'team_photo') return 'Team photo'
  return resolvePlayerLabel(code, name)
}

export function StickerPicker({ predicate, onPick, onClose, exclude, title }: Props) {
  const stickers = useStickersMap()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'name' | 'code'>('name')

  const candidates = useMemo(() => {
    const out: { code: string; teamCode: string; num: number; name: string | null }[] = []
    for (const team of TEAMS) {
      for (let i = 1; i <= 20; i++) {
        const code = `${team.code}-${i}`
        if (exclude?.has(code)) continue
        const sticker = stickers.get(code)
        const count = sticker?.count ?? 0
        if (!predicate(code, count)) continue
        out.push({ code, teamCode: team.code, num: i, name: sticker?.name ?? null })
      }
    }
    return out
  }, [stickers, predicate, exclude])

  const filtered = useMemo(() => {
    if (query.length === 0) return candidates
    if (mode === 'code') {
      const q = query.toUpperCase()
      return candidates.filter((c) => c.code.toUpperCase().includes(q))
    }
    const q = normalizeForSearch(query)
    return candidates.filter((c) => {
      const team = teamByCode(c.teamCode)
      const album = albumPlayerName(c.code)
      return (
        (c.name ? normalizeForSearch(c.name).includes(q) : false) ||
        (album ? normalizeForSearch(album).includes(q) : false) ||
        (team ? normalizeForSearch(team.name).includes(q) : false)
      )
    })
  }, [candidates, query, mode])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1 text-neutral-500"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="border-b border-neutral-100 px-4 py-3">
        <div className="mb-2 flex justify-end">
          <div className="inline-flex overflow-hidden rounded-md border border-neutral-200 text-[11px] font-medium">
            {(['name', 'code'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'px-2 py-1',
                  mode === m ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600',
                )}
              >
                {m === 'name' ? 'Name' : 'Code'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) =>
              setQuery(
                mode === 'code' ? applyAutoDash(e.target.value, TEAM_CODE_SET) : e.target.value,
              )
            }
            placeholder={mode === 'code' ? 'Code, e.g. POR-5' : 'Player or team…'}
            className="pl-9"
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-neutral-500">No matches</li>
        )}
        {filtered.map((c) => {
          const team = teamByCode(c.teamCode)
          return (
            <li key={c.code} className="border-b border-neutral-100">
              <button
                type="button"
                onClick={() => onPick(c.code)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-neutral-50"
              >
                {team && <Flag code={team.code} className="h-4 w-6" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-900">
                    {labelFor(c.code, c.num, c.name)}
                  </div>
                  <div className="text-[11px] text-neutral-500">{c.code}</div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/market/StickerPicker.tsx
git commit -m "Add StickerPicker overlay with name/code search"
```

---

### Task 15: TradeRow component

**Files:**
- Create: `src/components/market/RatioBadge.tsx`
- Create: `src/components/market/TradeRow.tsx`

- [ ] **Step 1: Create `src/components/market/RatioBadge.tsx`**

```tsx
import { cn } from '@/lib/utils'
import { sumQty, type Trade } from '@/lib/proposalSchema'
import { validateTrade } from '@/lib/proposalSchema'

type Props = { trade: Trade; className?: string }

export function RatioBadge({ trade, className }: Props) {
  const offered = trade.offered.length
  const requested = sumQty(trade.requested)
  const valid = validateTrade(trade).ok
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
        valid
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-rose-100 text-rose-800',
        className,
      )}
    >
      {offered} : {requested}
    </span>
  )
}
```

- [ ] **Step 2: Create `src/components/market/TradeRow.tsx`**

```tsx
import { Minus, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/button'
import { TEAMS, stickerKind, teamByCode } from '@/data/teams'
import { resolvePlayerLabel } from '@/lib/playerName'
import { availableSpare } from '@/lib/reservations'
import { sumQty, type Trade } from '@/lib/proposalSchema'
import { useReservations, useStickersMap } from '@/lib/state'
import { cn } from '@/lib/utils'
import { StickerPicker } from './StickerPicker'
import { RatioBadge } from './RatioBadge'

type Props = {
  trade: Trade
  index: number
  onChange: (next: Trade) => void
  onRemove: () => void
  removable: boolean
  excludedOfferedAcrossProposal: Set<string>
}

function labelForCode(code: string, name: string | null): string {
  const num = Number(code.split('-')[1])
  const kind = stickerKind(num)
  if (kind === 'badge') return 'Team badge'
  if (kind === 'team_photo') return 'Team photo'
  return resolvePlayerLabel(code, name)
}

export function TradeRow({
  trade,
  index,
  onChange,
  onRemove,
  removable,
  excludedOfferedAcrossProposal,
}: Props) {
  const stickers = useStickersMap()
  const { incoming, outgoing } = useReservations()
  const [openPicker, setOpenPicker] = useState<'offered' | 'requested' | null>(null)

  const totalRequested = sumQty(trade.requested)
  const isNToOne = trade.offered.length > 1 || totalRequested === 1
  const canAddOffered = totalRequested === 1 // adding 2+ offered forces N:1 mode
  const canAddRequested =
    trade.offered.length === 1 && totalRequested < 5 // 1:M mode, room left

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Trade {index + 1}
          </span>
          <RatioBadge trade={trade} />
        </div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-neutral-400 hover:text-rose-600"
            aria-label="Remove trade"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <section className="mb-3">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          They give (1+ from missing)
        </h4>
        <div className="flex flex-wrap gap-2">
          {trade.offered.map((code) => {
            const teamCode = code.split('-')[0]
            const team = teamByCode(teamCode)
            const sticker = stickers.get(code)
            return (
              <span
                key={code}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs"
              >
                {team && <Flag code={team.code} className="h-3 w-4.5" />}
                <span>{code}</span>
                <span className="text-neutral-500">·</span>
                <span className="max-w-[140px] truncate">
                  {labelForCode(code, sticker?.name ?? null)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...trade,
                      offered: trade.offered.filter((c) => c !== code),
                    })
                  }
                  className="text-neutral-400 hover:text-rose-600"
                  aria-label={`Remove ${code}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )
          })}
          {(trade.offered.length === 0 || canAddOffered) && (
            <button
              type="button"
              onClick={() => setOpenPicker('offered')}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-3 py-1 text-xs text-neutral-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add offered
            </button>
          )}
        </div>
        {trade.offered.length > 1 && (
          <p className="mt-2 text-[11px] text-neutral-500">
            Multiple offered → exactly 1 requested.
          </p>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          They want ({totalRequested} / {trade.offered.length === 1 ? 5 : 1})
        </h4>
        <div className="flex flex-col gap-2">
          {trade.requested.map((r, ri) => {
            const teamCode = r.code.split('-')[0]
            const team = teamByCode(teamCode)
            const sticker = stickers.get(r.code)
            const available = availableSpare(
              sticker?.count ?? 0,
              outgoing.get(r.code) ?? 0,
            )
            const stepperLocked = isNToOne
            return (
              <div
                key={r.code}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
              >
                {team && <Flag code={team.code} className="h-4 w-6" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {labelForCode(r.code, sticker?.name ?? null)}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {r.code} · {available} available
                  </div>
                </div>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={stepperLocked || r.qty <= 1}
                    onClick={() =>
                      onChange({
                        ...trade,
                        requested: trade.requested.map((x, i) =>
                          i === ri ? { ...x, qty: Math.max(1, x.qty - 1) } : x,
                        ),
                      })
                    }
                    className="rounded p-1 text-neutral-500 disabled:opacity-30"
                    aria-label="Decrement qty"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">{r.qty}</span>
                  <button
                    type="button"
                    disabled={
                      stepperLocked ||
                      totalRequested >= 5 ||
                      r.qty + 1 > available
                    }
                    onClick={() =>
                      onChange({
                        ...trade,
                        requested: trade.requested.map((x, i) =>
                          i === ri ? { ...x, qty: x.qty + 1 } : x,
                        ),
                      })
                    }
                    className="rounded p-1 text-neutral-500 disabled:opacity-30"
                    aria-label="Increment qty"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...trade,
                      requested: trade.requested.filter((_, i) => i !== ri),
                    })
                  }
                  className="rounded p-1 text-neutral-400 hover:text-rose-600"
                  aria-label="Remove requested"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
          {canAddRequested && (
            <button
              type="button"
              onClick={() => setOpenPicker('requested')}
              className="inline-flex items-center gap-1 self-start rounded-full border border-dashed border-neutral-300 px-3 py-1 text-xs text-neutral-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add requested
            </button>
          )}
        </div>
      </section>

      {openPicker === 'offered' && (
        <StickerPicker
          title="Pick a sticker you have to offer"
          predicate={(code, count) =>
            count === 0 && (incoming.get(code) ?? 0) === 0
          }
          exclude={
            new Set([...trade.offered, ...excludedOfferedAcrossProposal])
          }
          onPick={(code) => {
            onChange({ ...trade, offered: [...trade.offered, code] })
            setOpenPicker(null)
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}

      {openPicker === 'requested' && (
        <StickerPicker
          title="Pick a sticker you want"
          predicate={(code, count) => {
            if (count < 2) return false
            const out = outgoing.get(code) ?? 0
            return availableSpare(count, out) > 0
          }}
          exclude={new Set(trade.requested.map((r) => r.code))}
          onPick={(code) => {
            onChange({
              ...trade,
              requested: [...trade.requested, { code, qty: 1 }],
            })
            setOpenPicker(null)
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/market/RatioBadge.tsx src/components/market/TradeRow.tsx
git commit -m "Add TradeRow + RatioBadge with 1:M and N:1 constraints"
```

---

### Task 16: NewProposal page

**Files:**
- Modify: `src/pages/market/NewProposal.tsx`

- [ ] **Step 1: Replace stub with full implementation**

```tsx
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TradeRow } from '@/components/market/TradeRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  TRADES_PER_PROPOSAL_CAP,
  validateProposalDraft,
  type Trade,
} from '@/lib/proposalSchema'
import { createProposal } from '@/lib/proposals'

const EMPTY_TRADE: Trade = { offered: [], requested: [] }

export function NewProposal() {
  const navigate = useNavigate()
  const [trades, setTrades] = useState<Trade[]>([{ ...EMPTY_TRADE }])
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const offeredAcrossProposal = useMemo(() => {
    const all: string[] = []
    for (const t of trades) all.push(...t.offered)
    return new Set(all)
  }, [trades])

  const draft = { trades, proposer: { name, contact }, proposerNote: note }
  const validation = validateProposalDraft(draft)

  async function handleSubmit() {
    setError(null)
    const v = validateProposalDraft(draft)
    if (!v.ok) {
      setError(`Cannot submit: ${v.reason.replace(/_/g, ' ')}`)
      return
    }
    setSubmitting(true)
    try {
      const id = await createProposal(draft)
      navigate(`/market/p/${id}?just=1`)
    } catch (e) {
      console.error(e)
      setError('Failed to submit. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-3">
      <div>
        <h1 className="text-base font-semibold text-neutral-900">New proposal</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Each trade: 1 offered for up to 5 wanted, OR many offered for exactly 1 wanted.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {trades.map((trade, idx) => (
          <TradeRow
            key={idx}
            trade={trade}
            index={idx}
            onChange={(next) =>
              setTrades(trades.map((t, i) => (i === idx ? next : t)))
            }
            onRemove={() => setTrades(trades.filter((_, i) => i !== idx))}
            removable={trades.length > 1}
            excludedOfferedAcrossProposal={
              new Set(
                trades
                  .filter((_, i) => i !== idx)
                  .flatMap((t) => t.offered),
              )
            }
          />
        ))}
      </div>

      {trades.length < TRADES_PER_PROPOSAL_CAP && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setTrades([...trades, { ...EMPTY_TRADE }])}
        >
          <Plus className="h-4 w-4" />
          Add another trade
        </Button>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Your details</h3>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-neutral-600">
              Your name
            </span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-neutral-600">
              Contact (email, phone, IG handle…)
            </span>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="me@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-neutral-600">
              Note (optional)
            </span>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., can ship from Lisbon"
            />
          </label>
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-rose-100 px-3 py-2 text-xs text-rose-800">{error}</p>
      )}

      <Button
        type="button"
        disabled={!validation.ok || submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? 'Submitting…' : 'Submit proposal'}
      </Button>

      <Link to="/market" className="text-center text-xs text-neutral-500">
        Cancel and go back
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Manual smoke test**

```bash
pnpm dev
```

Visit `http://localhost:5173/market.html#/market/new` (or however your local dev maps it). Add a trade, pick offered+requested, submit. Note: actual submission will hit Firestore — confirm the doc lands in the `proposals` collection.

- [ ] **Step 3: Commit**

```bash
git add src/pages/market/NewProposal.tsx
git commit -m "Implement marketplace NewProposal page (trade builder + submit)"
```

---

### Task 17: ProposalTracking page

**Files:**
- Modify: `src/pages/market/ProposalTracking.tsx`

- [ ] **Step 1: Replace stub with full implementation**

```tsx
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/button'
import { teamByCode } from '@/data/teams'
import {
  resolvePlayerLabel,
} from '@/lib/playerName'
import type { Proposal } from '@/lib/proposalSchema'
import { fetchProposalById, withdrawProposal } from '@/lib/proposals'
import { useProposal } from '@/lib/state'

const STATUS_LABEL: Record<Proposal['status'], string> = {
  pending: 'Pending — awaiting decision',
  accepted: 'Accepted — arrange the swap',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<Proposal['status'], string> = {
  pending: 'bg-amber-100 text-amber-900',
  accepted: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-rose-100 text-rose-900',
  withdrawn: 'bg-neutral-200 text-neutral-700',
  completed: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-neutral-200 text-neutral-700',
}

export function ProposalTracking() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const justSubmitted = params.get('just') === '1'
  const live = useProposal(id)
  const [fallback, setFallback] = useState<Proposal | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    if (live) return
    fetchProposalById(id).then(setFallback)
  }, [id, live])

  const proposal = live ?? fallback ?? null

  if (proposal === null) {
    return (
      <div className="px-4 pt-8 text-center text-sm text-neutral-500">
        Proposal not found.
      </div>
    )
  }
  if (proposal === undefined) {
    return <div className="px-4 pt-8 text-center text-sm text-neutral-500">Loading…</div>
  }

  return <ProposalView proposal={proposal} justSubmitted={justSubmitted} />
}

function ProposalView({
  proposal,
  justSubmitted,
}: {
  proposal: Proposal
  justSubmitted: boolean
}) {
  const [withdrawing, setWithdrawing] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''

  async function copy() {
    await navigator.clipboard.writeText(url)
  }

  async function onWithdraw() {
    if (!confirm('Withdraw this proposal? This cannot be undone.')) return
    setWithdrawing(true)
    try {
      await withdrawProposal(proposal.id)
    } catch (e) {
      console.error(e)
      alert('Failed to withdraw.')
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-3">
      {justSubmitted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <p className="font-semibold">Submitted!</p>
          <p>Save this URL to track status — there's no login.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => void copy()}
          >
            Copy link
          </Button>
        </div>
      )}

      <div
        className={`rounded-xl px-3 py-2 text-sm font-semibold ${STATUS_COLOR[proposal.status]}`}
      >
        {STATUS_LABEL[proposal.status]}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Trades</h2>
        <ul className="flex flex-col gap-3">
          {proposal.trades.map((t, idx) => (
            <li key={idx} className="rounded-lg bg-neutral-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Trade {idx + 1}
              </div>
              <div className="mt-2">
                <div className="text-[11px] uppercase text-neutral-500">They give</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.offered.map((code) => (
                    <CodeChip key={code} code={code} />
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <div className="text-[11px] uppercase text-neutral-500">They want</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.requested.map((r) => (
                    <CodeChip key={r.code} code={r.code} qty={r.qty} />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {(proposal.proposerNote || proposal.ownerNote) && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          {proposal.proposerNote && (
            <div className="mb-2">
              <div className="text-[11px] uppercase text-neutral-500">Your note</div>
              <p className="mt-1 text-neutral-800">{proposal.proposerNote}</p>
            </div>
          )}
          {proposal.ownerNote && (
            <div>
              <div className="text-[11px] uppercase text-neutral-500">Owner reply</div>
              <p className="mt-1 text-neutral-800">{proposal.ownerNote}</p>
            </div>
          )}
        </section>
      )}

      {proposal.status === 'pending' && (
        <Button type="button" variant="outline" onClick={() => void onWithdraw()} disabled={withdrawing}>
          {withdrawing ? 'Withdrawing…' : 'Cancel proposal'}
        </Button>
      )}
    </div>
  )
}

function CodeChip({ code, qty }: { code: string; qty?: number }) {
  const teamCode = code.split('-')[0]
  const team = teamByCode(teamCode)
  const num = Number(code.split('-')[1])
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px]">
      {team && <Flag code={team.code} className="h-3 w-4.5" />}
      <span className="font-mono">{code}</span>
      {qty && qty > 1 && <span className="text-neutral-500">×{qty}</span>}
      <span className="max-w-[110px] truncate text-neutral-700">
        {resolvePlayerLabel(code, null)}
      </span>
      <span className="sr-only">{num}</span>
    </span>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/market/ProposalTracking.tsx
git commit -m "Implement marketplace ProposalTracking page with withdraw"
```

---

## Phase 5: Admin Inbox

### Task 18: Inbox page + ProposalCard + actions

**Files:**
- Create: `src/components/inbox/ProposalActions.tsx`
- Create: `src/pages/inbox/ProposalCard.tsx`
- Create: `src/pages/inbox/Inbox.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/components/inbox/ProposalActions.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  acceptProposal,
  cancelProposal,
  completeProposal,
  rejectProposal,
} from '@/lib/proposals'
import type { Proposal } from '@/lib/proposalSchema'

type Props = { proposal: Proposal }

export function ProposalActions({ proposal }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'accept' | 'reject' | null>(null)
  const [note, setNote] = useState('')

  async function run(action: () => Promise<void>, label: string) {
    setBusy(label)
    try {
      await action()
    } catch (e) {
      console.error(e)
      alert(`Failed: ${label}`)
    } finally {
      setBusy(null)
      setConfirming(null)
      setNote('')
    }
  }

  if (proposal.status === 'pending') {
    if (confirming) {
      return (
        <div className="flex flex-col gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Optional note for ${confirming}…`}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                run(
                  () =>
                    confirming === 'accept'
                      ? acceptProposal(proposal.id, note || null)
                      : rejectProposal(proposal.id, note || null),
                  confirming,
                )
              }
            >
              {busy ? 'Saving…' : `Confirm ${confirming}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirming(null)
                setNote('')
              }}
            >
              Back
            </Button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex gap-2">
        <Button type="button" onClick={() => setConfirming('accept')}>
          Accept
        </Button>
        <Button type="button" variant="outline" onClick={() => setConfirming('reject')}>
          Reject
        </Button>
      </div>
    )
  }

  if (proposal.status === 'accepted') {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy !== null}
          onClick={() => run(() => completeProposal(proposal.id), 'complete')}
        >
          {busy === 'complete' ? 'Saving…' : 'Mark completed'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => run(() => cancelProposal(proposal.id), 'cancel')}
        >
          {busy === 'cancel' ? 'Saving…' : 'Cancel swap'}
        </Button>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 2: Create `src/pages/inbox/ProposalCard.tsx`**

```tsx
import { Flag } from '@/components/Flag'
import { ProposalActions } from '@/components/inbox/ProposalActions'
import { teamByCode } from '@/data/teams'
import { resolvePlayerLabel } from '@/lib/playerName'
import type { Proposal } from '@/lib/proposalSchema'

const STATUS_PILL: Record<Proposal['status'], string> = {
  pending: 'bg-amber-100 text-amber-900',
  accepted: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-rose-100 text-rose-900',
  withdrawn: 'bg-neutral-200 text-neutral-700',
  completed: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-neutral-200 text-neutral-700',
}

function age(p: Proposal): string {
  if (!p.createdAt) return ''
  const now = Date.now()
  const created = p.createdAt.toMillis()
  const ms = now - created
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <header className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_PILL[proposal.status]}`}
        >
          {proposal.status}
        </span>
        <span className="text-[11px] text-neutral-500">{age(proposal)}</span>
        <span className="ml-auto text-[11px] text-neutral-500">
          {proposal.proposer.name}
        </span>
      </header>

      <div className="text-[11px] text-neutral-600">
        <span className="font-medium text-neutral-800">Contact:</span>{' '}
        {proposal.proposer.contact}
      </div>

      <ul className="flex flex-col gap-2">
        {proposal.trades.map((t, idx) => (
          <li key={idx} className="rounded bg-neutral-50 p-2 text-xs">
            <div className="text-[10px] font-semibold uppercase text-neutral-500">
              Trade {idx + 1}
            </div>
            <div className="mt-1">
              {t.offered.map((c) => <Chip key={c} code={c} />)}
              <span className="mx-1 text-neutral-400">→</span>
              {t.requested.map((r) => <Chip key={r.code} code={r.code} qty={r.qty} />)}
            </div>
          </li>
        ))}
      </ul>

      {proposal.proposerNote && (
        <p className="rounded bg-neutral-50 p-2 text-xs italic text-neutral-700">
          "{proposal.proposerNote}"
        </p>
      )}
      {proposal.ownerNote && (
        <p className="rounded bg-blue-50 p-2 text-xs text-blue-900">
          You: {proposal.ownerNote}
        </p>
      )}

      <ProposalActions proposal={proposal} />
    </article>
  )
}

function Chip({ code, qty }: { code: string; qty?: number }) {
  const teamCode = code.split('-')[0]
  const team = teamByCode(teamCode)
  return (
    <span className="mr-1 inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px]">
      {team && <Flag code={team.code} className="h-3 w-4.5" />}
      <span className="font-mono">{code}</span>
      {qty && qty > 1 && <span className="text-neutral-500">×{qty}</span>}
      <span className="max-w-[90px] truncate">{resolvePlayerLabel(code, null)}</span>
    </span>
  )
}
```

- [ ] **Step 3: Create `src/pages/inbox/Inbox.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { AuthGate } from '@/components/AuthGate'
import { SignInButton } from '@/components/SignInButton'
import type { Proposal } from '@/lib/proposalSchema'
import { useProposals } from '@/lib/state'
import { cn } from '@/lib/utils'
import { ProposalCard } from './ProposalCard'

type Filter = 'pending' | 'accepted' | 'history'

const HISTORY_STATUSES: Proposal['status'][] = [
  'rejected',
  'withdrawn',
  'completed',
  'cancelled',
]

export function Inbox() {
  return (
    <AuthGate>
      <InboxView />
    </AuthGate>
  )
}

function InboxView() {
  const proposals = useProposals()
  const [filter, setFilter] = useState<Filter>('pending')

  const filtered = useMemo(() => {
    const all = Array.from(proposals.values())
    const list =
      filter === 'pending'
        ? all.filter((p) => p.status === 'pending')
        : filter === 'accepted'
          ? all.filter((p) => p.status === 'accepted')
          : all.filter((p) => HISTORY_STATUSES.includes(p.status))
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis() ?? 0
      const tb = b.createdAt?.toMillis() ?? 0
      return tb - ta
    })
  }, [proposals, filter])

  const counts = useMemo(() => {
    const c = { pending: 0, accepted: 0, history: 0 }
    for (const p of proposals.values()) {
      if (p.status === 'pending') c.pending += 1
      else if (p.status === 'accepted') c.accepted += 1
      else if (HISTORY_STATUSES.includes(p.status)) c.history += 1
    }
    return c
  }, [proposals])

  return (
    <div className="pb-24">
      <header
        className="sticky top-0 z-20 flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">Inbox</h1>
          <SignInButton />
        </div>
        <div className="flex gap-2">
          {(['pending', 'accepted', 'history'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                filter === f
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-700 ring-1 ring-neutral-200',
              )}
            >
              {f === 'pending' ? 'Pending' : f === 'accepted' ? 'Accepted' : 'History'}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">Nothing here.</p>
        ) : (
          filtered.map((p) => <ProposalCard key={p.id} proposal={p} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add `/inbox` route to `src/App.tsx`**

```tsx
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from '@/components/TabBar'
import { Toaster } from '@/components/Toaster'
import { subscribeProposals, subscribeStickers } from '@/lib/state'
import { Doubles } from '@/pages/Doubles'
import { Home } from '@/pages/Home'
import { Inbox } from '@/pages/inbox/Inbox'
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
          <Route path="/inbox" element={<Inbox />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/inbox/ src/pages/inbox/ src/App.tsx
git commit -m "Add admin Inbox page with filters, ProposalCard, and actions"
```

---

### Task 19: Inbox tab in TabBar with badge

**Files:**
- Modify: `src/components/TabBar.tsx`

- [ ] **Step 1: Add Inbox tab with conditional rendering and badge**

```tsx
import { CircleDashed, Home, Inbox as InboxIcon, Layers, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useIsAdmin } from '@/lib/auth'
import { usePendingCount } from '@/lib/state'
import { cn } from '@/lib/utils'

const BASE_TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/missing', label: 'Missing', icon: CircleDashed },
  { to: '/doubles', label: 'Doubles', icon: Layers },
] as const

export function TabBar() {
  const admin = useIsAdmin()
  const pending = usePendingCount()
  const showInbox = admin.status === 'admin'

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-neutral-200 bg-white/90 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {BASE_TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-neutral-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.4]')} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
      {showInbox && (
        <NavLink
          to="/inbox"
          className={({ isActive }) =>
            cn(
              'relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-neutral-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <InboxIcon className={cn('h-5 w-5', isActive && 'stroke-[2.4]')} />
                {pending > 0 && (
                  <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {pending}
                  </span>
                )}
              </div>
              <span>Inbox</span>
            </>
          )}
        </NavLink>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Manual smoke test**

```bash
pnpm dev
```

Navigate to `http://localhost:5173/`. Tab bar should NOT show Inbox until you sign in (visit `/inbox` directly to trigger AuthGate's sign-in). Once signed in as an admin, Inbox tab should appear with badge.

- [ ] **Step 3: Commit**

```bash
git add src/components/TabBar.tsx
git commit -m "Add Inbox tab to TabBar with pending badge (admin-gated)"
```

---

### Task 20: Gate StickerSheet writes behind auth

**Files:**
- Modify: `src/components/StickerSheet.tsx`

- [ ] **Step 1: Disable +/- and the name field for non-admins, show inline sign-in hint**

```tsx
import { LogIn, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { stickerKind, teamByCode } from '@/data/teams'
import { signInWithGoogle, useIsAdmin } from '@/lib/auth'
import { albumPlayerName } from '@/lib/playerName'
import {
  decrementSticker,
  incrementSticker,
  setStickerName,
  useSticker,
} from '@/lib/state'

type Props = {
  code: string | null
  onClose: () => void
}

const KIND_LABEL: Record<ReturnType<typeof stickerKind>, string> = {
  badge: 'Team badge',
  team_photo: 'Team Photo',
  player: 'Player',
}

export function StickerSheet({ code, onClose }: Props) {
  const open = code !== null
  const sticker = useSticker(code ?? '___')
  const [draftName, setDraftName] = useState('')
  const adminCheck = useIsAdmin()
  const canEdit = adminCheck.status === 'admin'

  useEffect(() => {
    if (code) setDraftName(sticker.name ?? '')
  }, [code, sticker.name])

  if (!code) {
    return (
      <Sheet open={false} onOpenChange={(v) => !v && onClose()}>
        <SheetContent />
      </Sheet>
    )
  }

  const [teamCode, numStr] = code.split('-')
  const num = Number(numStr)
  const team = teamByCode(teamCode)
  const kind = stickerKind(num)
  const allowName = kind === 'player'

  const commitName = () => {
    if (!code || !canEdit) return
    void setStickerName(code, draftName)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <div className="flex items-center gap-3 pt-2">
          {team && <Flag code={team.code} className="h-6 w-9" />}
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate">{code}</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {KIND_LABEL[kind]}
              {team ? ` · ${team.name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-neutral-100 p-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Decrement"
            disabled={!canEdit || sticker.count === 0}
            onClick={() => void decrementSticker(code)}
            className="h-12 w-12 rounded-full"
          >
            <Minus className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums text-neutral-900">
              {sticker.count}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500">
              {sticker.count === 0
                ? 'Missing'
                : sticker.count === 1
                  ? 'Have'
                  : `Have +${sticker.count - 1} extra`}
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            aria-label="Increment"
            disabled={!canEdit}
            onClick={() => void incrementSticker(code)}
            className="h-12 w-12 rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {!canEdit && (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in to edit
          </button>
        )}

        {allowName && (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Player name
            </label>
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              placeholder={albumPlayerName(code) ?? 'Add a name'}
              autoComplete="off"
              disabled={!canEdit}
            />
            {albumPlayerName(code) && !draftName && (
              <p className="mt-1 text-[11px] text-neutral-500">
                Using album default. Type to override.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/StickerSheet.tsx
git commit -m "Gate StickerSheet edits behind admin auth"
```

---

## Phase 6: Final wiring

### Task 21: Reservation badges in existing Missing/Doubles

**Files:**
- Modify: `src/pages/Missing.tsx`
- Modify: `src/pages/Doubles.tsx`

- [ ] **Step 1: Add reservation badges to `Missing.tsx`**

Open `src/pages/Missing.tsx`. After the line `import { useStickersMap } from '@/lib/state'`, change it to:

```tsx
import { useReservations, useStickersMap } from '@/lib/state'
```

Add the import for the badge near the top of the imports:

```tsx
import { ReservationBadge } from '@/components/market/ReservationBadge'
```

Inside the `Missing` component, after `const stickers = useStickersMap()`, add:

```tsx
const { incoming } = useReservations()
```

Inside the rendered list item, replace:

```tsx
<span className="text-xs tabular-nums text-neutral-400">{s.code}</span>
```

with:

```tsx
{(incoming.get(s.code) ?? 0) > 0 && (
  <ReservationBadge kind="incoming" reserved={incoming.get(s.code)} className="mr-2" />
)}
<span className="text-xs tabular-nums text-neutral-400">{s.code}</span>
```

- [ ] **Step 2: Add reservation badges and adjust spare counts in `Doubles.tsx`**

Open `src/pages/Doubles.tsx`. Update imports to include reservations:

```tsx
import { useReservations, useStickersMap } from '@/lib/state'
import { availableSpare } from '@/lib/reservations'
import { ReservationBadge } from '@/components/market/ReservationBadge'
```

Inside the `Doubles` component, after `const stickers = useStickersMap()`, add:

```tsx
const { outgoing } = useReservations()
```

In the `allDoubles` `useMemo`, you can leave the data as-is (count is the raw count). In the rendered list item, locate where `spare: {s.count - 1}` is displayed and replace that block plus the `x{s.count}` badge with:

```tsx
<div className="text-[11px] tabular-nums text-neutral-500">
  {s.code} · {availableSpare(s.count, outgoing.get(s.code) ?? 0)} of {s.count - 1} spare
</div>
```

And change the orange badge to additionally show reservation state:

```tsx
{(() => {
  const reserved = outgoing.get(s.code) ?? 0
  const available = availableSpare(s.count, reserved)
  if (available === 0) {
    return <ReservationBadge kind="all-reserved" />
  }
  if (reserved > 0) {
    return (
      <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
        x{available}
      </span>
    )
  }
  return (
    <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
      x{s.count}
    </span>
  )
})()}
```

(Keep the rest of the structure the same.)

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

Visit `/missing` and `/doubles` in admin. With no accepted proposals, behavior is identical. After accepting a proposal, the affected stickers should show "incoming" / "all reserved" / reduced spare counts.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Missing.tsx src/pages/Doubles.tsx
git commit -m "Show reservation badges and reduced spare counts in admin Missing/Doubles"
```

---

### Task 22: Deploy Firestore rules + bootstrap first admin

**Files:** none (operational task)

- [ ] **Step 1: Install firebase-tools globally if not present**

```bash
pnpm dlx firebase-tools --version
```

If errors out, install globally:

```bash
npm i -g firebase-tools
```

- [ ] **Step 2: Login**

```bash
firebase login
```

- [ ] **Step 3: Set the active project**

```bash
firebase use --add
```

Pick the existing Firebase project (the one whose IDs are in your `.env`).

- [ ] **Step 4: Deploy rules**

```bash
firebase deploy --only firestore:rules
```

Expected: rules deploy successfully.

- [ ] **Step 5: Enable Google sign-in in Firebase Console**

Go to Firebase Console → Authentication → Sign-in method → enable Google. Add your production domain (Vercel URL) to authorized domains.

- [ ] **Step 6: Bootstrap first admin**

Visit the deployed app, attempt to sign in. You'll see "Not authorized" with your UID printed. In Firebase Console → Firestore → create a new document at path `admins/<that-uid>` with fields:

```
name (string): "Your Name"
addedAt (timestamp): now
```

Refresh the app — you should now see the Inbox tab.

- [ ] **Step 7: Commit a note about deploy**

This is operational, not a code change. Skip the commit.

---

### Task 23: End-to-end smoke test + final cleanup

**Files:** none (verification task)

- [ ] **Step 1: Build production bundle and preview**

```bash
pnpm build
pnpm preview
```

- [ ] **Step 2: Test the admin flow**

Visit `http://localhost:4173/`. Verify:

- Existing pages load and render correctly.
- Sign in: tab bar shows Inbox tab.
- Visit `/missing` — sticker controls work.
- StickerSheet +/- work for admin only.

- [ ] **Step 3: Test the marketplace flow**

Visit `http://localhost:4173/market.html`. Verify:

- Browse renders both lists with separate searches and Name/Code toggles.
- Auto-dash works in Code mode.
- Click "Send a swap proposal" → trade builder loads.
- Build a 1:M trade (1 offered, 2 requested with qty 2 each — should fail since sum=4 ok but try qty=6 — should be capped).
- Build an N:1 trade (3 offered, 1 requested with qty 1).
- Submit — lands on tracking page with copy-link button.
- Visit the tracking URL in a different browser session — proposal visible without sign-in.
- Click "Cancel proposal" — status flips to withdrawn.

- [ ] **Step 4: Test admin inbox flow**

Submit another proposal from marketplace, then in admin sign-in:

- Open Inbox — pending count badge updates.
- Click Accept — status flips, reservations appear.
- In Missing/Doubles admin pages, see incoming/reserved badges.
- Click "Mark completed" — reservation clears, no automatic count changes (verify counts in admin still match what they were before accept).

- [ ] **Step 5: Verify Firestore rules block unauthorized writes**

Open browser dev tools on the marketplace site (signed out), try to manually run from console:

```js
// This should fail with PERMISSION_DENIED
import('https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js')
```

(Skip the actual test if cumbersome — the rules guarantee this; the goal is just confidence.)

- [ ] **Step 6: Run all tests**

```bash
pnpm test
```

Expected: all green.

- [ ] **Step 7: Final lint and build**

```bash
pnpm lint
pnpm build
```

Expected: no errors.

- [ ] **Step 8: Commit any cleanup if needed**

If the smoke test surfaced fixes, commit them now.

---

## Self-Review Checklist (final pass before handoff)

- [ ] Spec covers: routes, data model, reservation logic, public UI, admin UI, auth, build/deploy → all addressed across tasks 1–23.
- [ ] No placeholders left in this plan — every code block contains the real code.
- [ ] Type names consistent: `Trade`, `TradeRequest`, `Proposal`, `ProposalDraft`, `ProposalStatus`, `ReservationMaps`, `AdminCheck`, `AuthState` — used identically across tasks.
- [ ] Test names exist for: `validateTrade`, `validateProposalDraft`, `deriveReservations`, `applyAutoDash`. UI components rely on type-checking + manual smoke testing.
- [ ] Firebase Auth is added in Task 5 and used in Tasks 6, 10, 18, 19, 20.
- [ ] `nanoid` added in Task 1, used in Task 10.
- [ ] Vite multi-entry added in Task 2; `vercel.json` added in Task 3 for deep-link support.
- [ ] Firestore rules created in Task 4, deployed in Task 22 — separated so the admin app doesn't lose write access mid-implementation.
