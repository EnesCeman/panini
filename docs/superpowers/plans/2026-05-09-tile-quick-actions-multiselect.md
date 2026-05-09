# Tile quick-actions and multi-select implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tile-level +/- buttons for instant single-sticker edits, and a Team-detail "select mode" with a "+1 to all" bulk action.

**Architecture:** Three layers change. The state layer gets one new mutation (`incrementMany`). `StickerTile` gains a footer button row plus three select-mode props. `TeamDetail` owns the new local state (`selectMode`, `selected`) and renders either the existing header or the new selection toolbar. No new files.

**Tech Stack:** React 19, TypeScript, Zustand v5, Firebase Firestore, Tailwind CSS, lucide-react icons.

**Note on tests:** The original product spec lists tests under "Out of scope" and the user has not changed that. This plan therefore replaces the usual TDD steps with manual smoke checks (`pnpm` type-check + dev-server probes against the running app at localhost:5173). User instructions override the skill default per `superpowers:using-superpowers`.

**Files touched:**
- Modify: `src/lib/state.ts` — add `incrementMany`
- Modify: `src/components/StickerTile.tsx` — footer + select-mode props
- Modify: `src/pages/TeamDetail.tsx` — select-mode state, toolbar, prop wiring

---

## Task 1: Add `incrementMany` mutation

**Files:**
- Modify: `src/lib/state.ts` (append a new exported async function near the existing single-sticker mutations, ~lines 130–end)

- [ ] **Step 1: Add the `incrementMany` function**

Append after the existing `setStickerName` export, end of file:

```ts
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

- [ ] **Step 2: Type-check**

Run: `.\node_modules\.bin\tsc.cmd -b --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```
git add src/lib/state.ts
git commit -m "Add incrementMany mutation for bulk +1 updates"
```

---

## Task 2: Add footer `+`/`−` to `StickerTile`

**Files:**
- Modify: `src/components/StickerTile.tsx` — entire file rewrite below

This task introduces the footer buttons in normal (non-select) mode only. Select-mode props come in Task 3.

- [ ] **Step 1: Rewrite `StickerTile.tsx`**

Replace the file's contents with:

```tsx
import { Check, Minus, Plus } from 'lucide-react'
import type { MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import { stickerKind } from '@/data/teams'
import { decrementSticker, incrementSticker, useSticker } from '@/lib/state'

type Props = {
  code: string
  num: number
  onSelect: (code: string) => void
}

export function StickerTile({ code, num, onSelect }: Props) {
  const sticker = useSticker(code)
  const kind = stickerKind(num)
  const owned = sticker.count >= 1
  const extras = sticker.count >= 2

  const label =
    kind === 'badge'
      ? 'BADGE'
      : kind === 'team_photo'
        ? 'PHOTO'
        : sticker.name && sticker.name.length > 0
          ? sticker.name
          : code

  const stop = (e: MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={cn(
        'group relative flex aspect-[4/5] flex-col overflow-hidden rounded-lg border text-center',
        !owned && 'border-neutral-200 bg-neutral-100 text-neutral-400',
        owned && !extras && 'border-emerald-300 bg-emerald-50 text-emerald-900',
        extras && 'border-amber-300 bg-amber-50 text-amber-900',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(code)}
        aria-label={`Sticker ${code}, count ${sticker.count}, open editor`}
        className="flex flex-1 flex-col items-center justify-center px-1.5 pt-1.5 transition active:scale-[0.97]"
      >
        <span
          className={cn(
            'absolute left-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
            !owned && 'bg-neutral-300 text-neutral-700',
            owned && !extras && 'bg-emerald-600 text-white',
            extras && 'bg-amber-600 text-white',
          )}
        >
          {num}
        </span>
        {owned && !extras && (
          <Check className="absolute right-1 top-1 h-4 w-4 text-emerald-600" />
        )}
        {extras && (
          <span className="absolute right-1 top-1 inline-flex h-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-white">
            x{sticker.count}
          </span>
        )}
        <span
          className={cn(
            'mt-2 line-clamp-2 break-words px-1 text-[11px] font-medium leading-tight',
            (kind === 'badge' || kind === 'team_photo') && 'tracking-wide text-[10px]',
          )}
        >
          {label}
        </span>
      </button>
      <div className="flex h-10 border-t border-current/10">
        <button
          type="button"
          aria-label={`Decrement ${code}`}
          disabled={sticker.count === 0}
          onClick={(e) => {
            stop(e)
            void decrementSticker(code)
          }}
          className={cn(
            'flex flex-1 items-center justify-center transition active:bg-black/5 disabled:opacity-40',
            'border-r border-current/10',
          )}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Increment ${code}`}
          onClick={(e) => {
            stop(e)
            void incrementSticker(code)
          }}
          className="flex flex-1 items-center justify-center transition active:bg-black/5"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

Notes:
- The outer element changed from `<button>` to `<div>` because a button cannot legally contain other buttons. The body region is its own button (the modal trigger), and the footer holds two more buttons (inc/dec).
- Tile aspect changed from `aspect-[3/4]` to `aspect-[4/5]` per spec — a slightly taller tile to accommodate the 40px (`h-10`) footer.
- The badge `x{count}` moved from bottom-right to top-right because the bottom edge is now the footer.

- [ ] **Step 2: Type-check**

Run: `.\node_modules\.bin\tsc.cmd -b --noEmit`
Expected: no output.

- [ ] **Step 3: Smoke-test in browser**

The dev server is already running at localhost:5173. Hard-refresh `localhost:5173/team/POR` (or any team) and verify:
- Each sticker tile now has a `−` and `+` row at the bottom.
- Tap `+` on any tile: count goes up by 1, no modal opens.
- Tap `−` on a count>=1 tile: count goes down, no modal opens.
- `−` is dimmed (disabled) when count is 0.
- Tap the body of a tile (above the footer): the modal opens as before.

- [ ] **Step 4: Commit**

```
git add src/components/StickerTile.tsx
git commit -m "Add inline +/- footer to StickerTile for instant edits"
```

---

## Task 3: Add select-mode props to `StickerTile`

**Files:**
- Modify: `src/components/StickerTile.tsx`

Now extend the tile to render selection visuals when `selectMode` is true and to route body taps to `onToggleSelect` instead of `onSelect`.

- [ ] **Step 1: Replace `StickerTile.tsx` with the select-mode-aware version**

```tsx
import { Check, Minus, Plus } from 'lucide-react'
import type { MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import { stickerKind } from '@/data/teams'
import { decrementSticker, incrementSticker, useSticker } from '@/lib/state'

type Props = {
  code: string
  num: number
  onSelect: (code: string) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (code: string) => void
}

export function StickerTile({
  code,
  num,
  onSelect,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const sticker = useSticker(code)
  const kind = stickerKind(num)
  const owned = sticker.count >= 1
  const extras = sticker.count >= 2

  const label =
    kind === 'badge'
      ? 'BADGE'
      : kind === 'team_photo'
        ? 'PHOTO'
        : sticker.name && sticker.name.length > 0
          ? sticker.name
          : code

  const stop = (e: MouseEvent) => {
    e.stopPropagation()
  }

  const handleBody = () => {
    if (selectMode) {
      onToggleSelect?.(code)
    } else {
      onSelect(code)
    }
  }

  return (
    <div
      className={cn(
        'group relative flex aspect-[4/5] flex-col overflow-hidden rounded-lg border text-center transition',
        !owned && 'border-neutral-200 bg-neutral-100 text-neutral-400',
        owned && !extras && 'border-emerald-300 bg-emerald-50 text-emerald-900',
        extras && 'border-amber-300 bg-amber-50 text-amber-900',
        selected && 'ring-2 ring-primary ring-offset-1',
      )}
    >
      <button
        type="button"
        onClick={handleBody}
        aria-label={
          selectMode
            ? `${selected ? 'Deselect' : 'Select'} sticker ${code}`
            : `Sticker ${code}, count ${sticker.count}, open editor`
        }
        aria-pressed={selectMode ? selected : undefined}
        className="flex flex-1 flex-col items-center justify-center px-1.5 pt-1.5 transition active:scale-[0.97]"
      >
        <span
          className={cn(
            'absolute left-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
            !owned && 'bg-neutral-300 text-neutral-700',
            owned && !extras && 'bg-emerald-600 text-white',
            extras && 'bg-amber-600 text-white',
          )}
        >
          {num}
        </span>
        {selectMode && selected ? (
          <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </span>
        ) : (
          <>
            {owned && !extras && (
              <Check className="absolute right-1 top-1 h-4 w-4 text-emerald-600" />
            )}
            {extras && (
              <span className="absolute right-1 top-1 inline-flex h-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-white">
                x{sticker.count}
              </span>
            )}
          </>
        )}
        <span
          className={cn(
            'mt-2 line-clamp-2 break-words px-1 text-[11px] font-medium leading-tight',
            (kind === 'badge' || kind === 'team_photo') && 'tracking-wide text-[10px]',
          )}
        >
          {label}
        </span>
      </button>
      {!selectMode && (
        <div className="flex h-10 border-t border-current/10">
          <button
            type="button"
            aria-label={`Decrement ${code}`}
            disabled={sticker.count === 0}
            onClick={(e) => {
              stop(e)
              void decrementSticker(code)
            }}
            className="flex flex-1 items-center justify-center border-r border-current/10 transition active:bg-black/5 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Increment ${code}`}
            onClick={(e) => {
              stop(e)
              void incrementSticker(code)
            }}
            className="flex flex-1 items-center justify-center transition active:bg-black/5"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
```

The new behavior:
- When `selectMode` is true: footer is not rendered. Body tap calls `onToggleSelect(code)`. Selected tiles render a `ring-2 ring-primary ring-offset-1` outline and replace the top-right indicator with a primary-coloured check pill.
- When `selectMode` is false: original behavior plus the footer from Task 2.

- [ ] **Step 2: Type-check**

Run: `.\node_modules\.bin\tsc.cmd -b --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

(No browser smoke test yet — `selectMode` isn't reachable from the UI until Task 4.)

```
git add src/components/StickerTile.tsx
git commit -m "Add select-mode props to StickerTile"
```

---

## Task 4: Add select-mode state and toolbar to `TeamDetail`

**Files:**
- Modify: `src/pages/TeamDetail.tsx` — entire file rewrite

- [ ] **Step 1: Replace `TeamDetail.tsx`**

```tsx
import { CheckSquare, ChevronLeft, X } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Flag } from '@/components/Flag'
import { GroupPill } from '@/components/GroupPill'
import { StickerSheet } from '@/components/StickerSheet'
import { StickerTile } from '@/components/StickerTile'
import { Button } from '@/components/ui/button'
import { teamByCode } from '@/data/teams'
import { incrementMany, useTeamProgress } from '@/lib/state'

export function TeamDetail() {
  const { code = '' } = useParams<{ code: string }>()
  const upper = code.toUpperCase()
  const team = teamByCode(upper)
  const { have, total } = useTeamProgress(upper)
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (!team) return <Navigate to="/teams" replace />

  const enterSelect = () => {
    setSelected(new Set())
    setSelectMode(true)
  }

  const exitSelect = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const toggleSelect = (stickerCode: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(stickerCode)) next.delete(stickerCode)
      else next.add(stickerCode)
      return next
    })
  }

  const applyBulk = () => {
    if (selected.size === 0) {
      exitSelect()
      return
    }
    void incrementMany(Array.from(selected))
    exitSelect()
  }

  const headerStyle = {
    paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
  } as const

  return (
    <div className="pb-24">
      {selectMode ? (
        <header
          className="sticky top-0 z-20 flex items-center gap-2 border-b border-neutral-200 bg-neutral-50/85 px-3 py-3 backdrop-blur"
          style={headerStyle}
        >
          <button
            type="button"
            onClick={exitSelect}
            aria-label="Cancel selection"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="flex-1 text-sm font-medium text-neutral-900">
            {selected.size} selected
          </span>
          <Button
            type="button"
            size="sm"
            onClick={applyBulk}
            disabled={selected.size === 0}
          >
            +1 to all
          </Button>
        </header>
      ) : (
        <header
          className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-neutral-50/85 px-3 py-3 backdrop-blur"
          style={headerStyle}
        >
          <Link
            to="/teams"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Flag code={team.code} className="h-5 w-7" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold text-neutral-900">{team.name}</h1>
              <GroupPill group={team.group} />
            </div>
            <p className="text-xs tabular-nums text-neutral-500">
              {have}/{total} stickers
            </p>
          </div>
          <button
            type="button"
            onClick={enterSelect}
            aria-label="Select multiple stickers"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200"
          >
            <CheckSquare className="h-5 w-5" />
          </button>
        </header>
      )}

      <div className="grid grid-cols-4 gap-2 px-3 pt-4">
        {Array.from({ length: 20 }, (_, i) => {
          const num = i + 1
          const stickerCode = `${team.code}-${num}`
          return (
            <StickerTile
              key={stickerCode}
              code={stickerCode}
              num={num}
              onSelect={setOpenCode}
              selectMode={selectMode}
              selected={selected.has(stickerCode)}
              onToggleSelect={toggleSelect}
            />
          )
        })}
      </div>

      <StickerSheet
        code={selectMode ? null : openCode}
        onClose={() => setOpenCode(null)}
      />
    </div>
  )
}
```

Notes:
- `StickerSheet` receives `null` while in select mode so it's never opened mid-selection.
- `applyBulk` calls `incrementMany` (added in Task 1), then exits select mode without waiting for the network — the existing snapshot listener reconciles the final values, and any failures roll back via the toast path.

- [ ] **Step 2: Type-check**

Run: `.\node_modules\.bin\tsc.cmd -b --noEmit`
Expected: no output.

- [ ] **Step 3: Smoke-test the new flow**

Hard-refresh `localhost:5173/team/POR` and verify:
- A `CheckSquare` icon appears in the right side of the header.
- Tapping it switches the header to `[× Cancel]   N selected   [+1 to all]`. Tile footers disappear.
- Tapping tiles toggles the primary-color ring + check overlay; the modal does NOT open.
- The `+1 to all` button is disabled at `0 selected`.
- Selecting 3 tiles, tapping `+1 to all` — all 3 increment by 1 and the page returns to normal mode.
- Tapping `×` cancels without changes.
- Back in normal mode: tile footers `−`/`+` work as before; tapping body opens the modal.

- [ ] **Step 4: Commit**

```
git add src/pages/TeamDetail.tsx
git commit -m "Add select mode and +1-to-all bulk action on TeamDetail"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full type-check**

Run: `.\node_modules\.bin\tsc.cmd -b --noEmit`
Expected: no output.

- [ ] **Step 2: Production build**

Run: `.\node_modules\.bin\vite.cmd build`
Expected: `✓ built in <time>` with no error lines, only the chunk-size warning.

- [ ] **Step 3: Confirm clean git state**

Run: `git status`
Expected: `working tree clean` (or only the auto-generated `dist/` if you didn't gitignore it; verify it's already covered by the existing `.gitignore`).

- [ ] **Step 4: Probe both pages with curl**

Run:
```
curl -s -o /dev/null -w "Home: %{http_code}\n" http://localhost:5173/
curl -s -o /dev/null -w "POR:  %{http_code}\n" http://localhost:5173/team/POR
```
Expected: `Home: 200` and `POR: 200`.

- [ ] **Step 5: Tail dev server log for HMR errors**

Run:
```
tail -20 "C:/Users/zidan/AppData/Local/Temp/claude/C--Users-zidan-Downloads-panini/fafd3415-a8b5-4c2f-8fa3-33053efeea8d/tasks/by6sa7czv.output"
```
(Or whichever task ID is currently running the dev server — list with `Bash` if unsure.)
Expected: only `hmr update` lines from this session, no `Unhandled error` and no `getSnapshot should be cached`.
