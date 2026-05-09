# Tile quick-actions and bulk multi-select

**Date:** 2026-05-09
**Status:** Approved, ready for implementation plan
**Scope:** `TeamDetail` page only

## Problem

Adding stickers one at a time currently requires opening a bottom sheet for each. That's fine for setting names but slow when entering a stack of newly-acquired stickers. Two ergonomics gaps:

1. Single-sticker `+1` / `-1` should not need a modal.
2. Marking a batch of newly-acquired stickers as `+1` should be one action, not one-per-sticker.

## Design

### Tile-level `+`/`−` buttons

`StickerTile` gains a fixed 2-button footer rendered inside the tile bottom edge.

- Layout: equal-width left and right halves. Left = `−`, right = `+`. Footer height ~32 px. Buttons fill their half and offer a 44 px+ tap target effectively (footer height + tile bottom inset).
- `−` is disabled when `count === 0`. `+` is always enabled.
- Tapping a footer button calls `incrementSticker(code)` or `decrementSticker(code)` directly — no modal, no propagation. Body of the tile (everything above the footer) remains the modal trigger.
- Tile aspect adjusts from `aspect-[3/4]` to a slightly taller ratio so the existing top-row badges and label area don't compress when the footer is present.
- In **select mode** (see below) the footer is not rendered.

### Multi-select on TeamDetail

A page-local mode that turns the sticker grid into a selection surface.

- New header button (lucide `CheckSquare` icon) next to the `have/total` text. Tapping it enters select mode and clears any previous selection.
- While in select mode:
  - The page header is replaced by a **select toolbar** in the same sticky region: `[× Cancel]   N selected   [+1 to all]`.
  - Tapping a tile body toggles its selection — the modal does not open.
  - Selected tiles render a `ring-2 ring-primary` outline and a check overlay in the top-right (replacing the ownership badge while selected).
  - Tile footers are hidden so the entire tile is one obvious tap target.
- `[+1 to all]` calls `incrementMany(codes)` with the selected codes, then exits select mode and clears the selection. The toolbar primary action is disabled when nothing is selected.
- `[× Cancel]` exits select mode without changes.

### State layer additions (`lib/state.ts`)

One new mutation:

```
async function incrementMany(codes: string[]): Promise<void>
```

Behavior:

- For each code, optimistically `patchSticker(code, { count: prev.count + 1, name: prev.name })`.
- Issue all `setDoc(ref, { count: increment(1), updatedAt: serverTimestamp() }, { merge: true })` writes in parallel via `Promise.allSettled`.
- For each rejected write: roll back that single sticker to its prior value and push a single error toast summarising the count of failures (`"N updates failed"`). Successes stay applied.
- The Firestore snapshot will subsequently reconcile any drift.

No new state slice; `useStore` keeps its current shape.

### Local state in `TeamDetail`

- `selectMode: boolean`
- `selected: Set<string>` of sticker codes
- Existing `openCode: string | null` is suppressed while `selectMode` is true (don't open the modal during selection).

`StickerTile` props grow by:

- `selectMode: boolean`
- `selected: boolean`
- `onToggleSelect?: (code: string) => void`

When `selectMode` is true, the tile renders the selection visuals and routes body taps to `onToggleSelect`. When false, current behavior is unchanged except for the new footer.

## Out of scope

- Multi-select on `Missing` or `Doubles` pages.
- A `-1 to all` bulk action.
- Persisting selection across navigation away from the page.
- Keyboard shortcuts for select mode.

## Risks / open notes

- Bulk write under flaky network: `Promise.allSettled` + per-failure rollback handles partial failure but the user sees a generic toast; per-code feedback is intentionally not surfaced to keep the UI simple.
- Optimistic snapshot reconciliation: when the Firestore listener fires after the bulk increment lands, every successfully-incremented sticker will briefly converge to its server value. Same path the single-sticker mutation already exercises.
