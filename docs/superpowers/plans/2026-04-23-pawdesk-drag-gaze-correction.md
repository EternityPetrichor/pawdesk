# Pawdesk Drag and Gaze Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix pet drift during fast dragging and incorrect eye direction after fast dragging by using one stable drag coordinate system and a visual eye anchor.

**Architecture:** Dragging should be anchored in the main process using Electron screen/window coordinates only: on drag start, compute cursor-to-window delta from `screen.getCursorScreenPoint()` and `petWindow.getPosition()`, then reuse that delta for all drag frames. Eye tracking should compute pupil offset relative to the visual eye/face center, not the transparent window center.

**Tech Stack:** Electron 35, React 19, TypeScript 5, electron-vite, existing `pnpm typecheck` validation.

---

## Files and Responsibilities

- Modify `src/shared/types/pet.ts`: remove renderer-provided drag offsets from `PetDragStartPayload`; keep only start cursor coordinates if still needed for type compatibility.
- Modify `src/preload/index.ts`: update `pointerDown` payload type to match shared drag start payload.
- Modify `src/shared/types/electron.d.ts`: update exposed `window.pawdesk.pet.pointerDown` type.
- Modify `src/renderer/src/pet/PetCanvas.tsx`: stop sending `clientX/clientY` as drag offsets.
- Modify `src/main/ipc/pet-events.ts`: compute drag grab offset from main-process cursor and current window position; avoid trusting renderer DOM coordinates.
- Modify `src/renderer/src/pet/usePointerTracking.ts`: use visual eye anchor constants derived from existing CSS instead of window center.
- Run `pnpm typecheck`: current project has no focused unit test runner for these modules, so typecheck plus manual Electron verification is required.

---

### Task 1: Remove renderer drag offset from the drag-start contract

**Files:**
- Modify: `src/shared/types/pet.ts:44-49`
- Modify: `src/preload/index.ts:4,26-28`
- Modify: `src/shared/types/electron.d.ts:1-30`
- Modify: `src/renderer/src/pet/PetCanvas.tsx:52-57`

- [ ] **Step 1: Write the failing type-level expectation**

Change `src/renderer/src/pet/PetCanvas.tsx` first so it sends no DOM/client offsets:

```tsx
    window.pawdesk.pet.pointerDown({
      screenX: event.screenX,
      screenY: event.screenY
    })
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: FAIL because `pointerDown` still requires `offsetX` and `offsetY` in the preload/electron/shared types.

- [ ] **Step 3: Update shared drag payload type**

In `src/shared/types/pet.ts`, replace `PetDragStartPayload` with:

```ts
export interface PetDragStartPayload {
  screenX: number
  screenY: number
}
```

- [ ] **Step 4: Update preload pointerDown type**

In `src/preload/index.ts`, add `PetDragStartPayload` to the import:

```ts
import type { PetAnimationState, PetDragStartPayload, PetPointerMovePayload, PetSnapshot, TodoScope, WorkEventPayload, WorkTool } from '../shared/types/pet'
```

Then replace the inline payload type:

```ts
    pointerDown: (payload: PetDragStartPayload) => {
      ipcRenderer.send('pet:pointer-down', payload)
    },
```

- [ ] **Step 5: Update renderer global type**

In `src/shared/types/electron.d.ts`, add `PetDragStartPayload` to the import and update the `pointerDown` signature:

```ts
import type { PetAnimationState, PetDragStartPayload, PetPointerMovePayload, PetSnapshot, TodoScope, WorkEventPayload, WorkTool } from './pet'
```

```ts
        pointerDown: (payload: PetDragStartPayload) => void
```

- [ ] **Step 6: Run typecheck to verify Task 1 passes**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: PASS or only failures in `src/main/ipc/pet-events.ts` because it still reads removed `offsetX/offsetY`. If only `pet-events.ts` fails, proceed to Task 2.

---

### Task 2: Compute drag grab offset in the main process

**Files:**
- Modify: `src/main/ipc/pet-events.ts:6-12,47-66,134-147`

- [ ] **Step 1: Create the failing implementation pressure**

After Task 1, run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: FAIL in `src/main/ipc/pet-events.ts` where `payload.offsetX`, `payload.offsetY`, or `startCursor.offsetX/offsetY` are still referenced.

- [ ] **Step 2: Replace drag state cursor shape**

In `src/main/ipc/pet-events.ts`, replace the `DragState` interface with:

```ts
interface DragState {
  active: boolean
  dragging: boolean
  startCursor: { screenX: number; screenY: number } | null
  grabOffset: { x: number; y: number } | null
  latestCursor: { screenX: number; screenY: number } | null
  latestPosition: { x: number; y: number } | null
  pollTimer: NodeJS.Timeout | null
}
```

- [ ] **Step 3: Initialize `grabOffset`**

In the `dragState` object, add `grabOffset: null`:

```ts
  const dragState: DragState = {
    active: false,
    dragging: false,
    startCursor: null,
    grabOffset: null,
    latestCursor: null,
    latestPosition: null,
    pollTimer: null
  }
```

- [ ] **Step 4: Require grab offset before drag updates**

Replace the guard at the top of `updateDragPosition`:

```ts
    if (!dragState.active || !dragState.startCursor || !dragState.grabOffset) {
      return
    }
```

- [ ] **Step 5: Stop copying offset values into latest cursor**

Replace `dragState.latestCursor = ...` inside `updateDragPosition` with:

```ts
    dragState.latestCursor = {
      screenX: cursorPoint.x,
      screenY: cursorPoint.y
    }
```

- [ ] **Step 6: Use main-process grab offset for window position**

Replace the `nextPosition` calculation with:

```ts
    const nextPosition = {
      x: Math.round(cursor.screenX - dragState.grabOffset.x),
      y: Math.round(cursor.screenY - dragState.grabOffset.y)
    }
```

- [ ] **Step 7: Compute grab offset on pointer down**

Replace the `ipcMain.on('pet:pointer-down'...)` body setup section with:

```ts
  ipcMain.on('pet:pointer-down', (_event, payload: PetDragStartPayload) => {
    const cursorPoint = screen.getCursorScreenPoint()
    const [x, y] = petWindow.getPosition()

    dragState.active = true
    dragState.dragging = false
    dragState.startCursor = {
      screenX: Number(payload.screenX),
      screenY: Number(payload.screenY)
    }
    dragState.grabOffset = {
      x: cursorPoint.x - Number(x),
      y: cursorPoint.y - Number(y)
    }
    dragState.latestCursor = {
      screenX: cursorPoint.x,
      screenY: cursorPoint.y
    }
    dragState.latestPosition = { x: Number(x), y: Number(y) }
    startDragPolling()
  })
```

This intentionally uses `screen.getCursorScreenPoint()` for the actual drag anchor so the renderer cannot mix DOM client coordinates into main-process window movement.

- [ ] **Step 8: Clear grab offset on pointer up**

In the pointer-up cleanup block, add:

```ts
    dragState.grabOffset = null
```

Place it beside `startCursor = null` and `latestCursor = null`.

- [ ] **Step 9: Run typecheck to verify Task 2 passes**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: PASS for drag-related types and no `offsetX/offsetY` references in drag state.

---

### Task 3: Change eye tracking to use the visual eye anchor

**Files:**
- Modify: `src/renderer/src/pet/usePointerTracking.ts:4-26`
- Reference only: `src/renderer/src/styles.css:47-126`

- [ ] **Step 1: Write the failing type-safe behavior change**

In `src/renderer/src/pet/usePointerTracking.ts`, add these constants above `clampEyeOffset`:

```ts
const PET_BODY_WIDTH = 146
const PET_SCENE_TOP = 92
const PET_FACE_TOP = 42
const PET_EYE_SIZE = 28

const EYE_ANCHOR_X = PET_BODY_WIDTH / 2
const EYE_ANCHOR_Y = PET_SCENE_TOP + PET_FACE_TOP + PET_EYE_SIZE / 2
```

Then replace the center calculation in the callback with:

```ts
      const petWidth = payload.petWidth ?? window.innerWidth
      const centerX = (payload.petX ?? 0) + petWidth / 2
      const centerY = (payload.petY ?? 0) + EYE_ANCHOR_Y
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: FAIL if `EYE_ANCHOR_X` is unused, because `noUnusedLocals` is enabled.

- [ ] **Step 3: Remove unused horizontal constant and keep only needed visual Y anchor**

Use this exact constant block instead:

```ts
const PET_SCENE_TOP = 92
const PET_FACE_TOP = 42
const PET_EYE_SIZE = 28
const EYE_ANCHOR_Y = PET_SCENE_TOP + PET_FACE_TOP + PET_EYE_SIZE / 2
```

Keep the callback center calculation as:

```ts
      const petWidth = payload.petWidth ?? window.innerWidth
      const centerX = (payload.petX ?? 0) + petWidth / 2
      const centerY = (payload.petY ?? 0) + EYE_ANCHOR_Y
```

Do not change the clamp or sign. Positive CSS translate Y moves the pupil down, and current sign is consistent with screen coordinates.

- [ ] **Step 4: Run typecheck to verify Task 3 passes**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: PASS.

---

### Task 4: Manual verification in Electron

**Files:**
- No source changes unless verification exposes a missed root cause.

- [ ] **Step 1: Start the app**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm dev
```

Expected: Electron app opens and the pet window appears.

- [ ] **Step 2: Verify drag anchor stability**

Manual checks:

- Press on the pet body center, drag rapidly left/right for 10 seconds, and confirm the same grabbed point stays under the cursor.
- Press near the pet body left edge, drag rapidly left/right for 10 seconds, and confirm it does not drift horizontally.
- Press near the pet body right edge, drag rapidly left/right for 10 seconds, and confirm it does not drift horizontally.
- Press on visible child elements such as face/eye area, drag rapidly, and confirm child-target clicks do not change the grab anchor.

Expected: no gradual left/right offset while dragging.

- [ ] **Step 3: Verify gaze direction after fast drag**

Manual checks:

- Drag rapidly and stop with the mouse below the eyes but inside the body.
- Drag rapidly and stop with the mouse near the lower body/feet.
- Drag rapidly and stop with the mouse above the pet.

Expected: pupils look down when the cursor is below the eye anchor and up when the cursor is above the eye anchor.

- [ ] **Step 4: Verify no obvious regressions**

Manual checks:

- Click without dragging and confirm poke interaction still happens.
- Drag and release, then restart the app and confirm position persistence still works through `petSession.updatePosition`.
- Move the cursor around the pet without dragging and confirm eyes still follow globally.

Expected: existing click, drag release, persistence, and global pointer tracking behavior remains intact.

---

### Task 5: Request adversarial review

**Files:**
- No direct source changes unless reviewer finds a blocker.

- [ ] **Step 1: Ask reviewer to inspect the patch**

Send the reviewer this checklist:

```text
Please review the drag/gaze patch. Focus on whether it truly uses one coordinate system, whether main-process grabOffset avoids renderer DOM/client coordinates, whether eye center should be a CSS-derived constant or measured rect, and whether drag/global pointer broadcasts can still send stale pet positions after release.
```

- [ ] **Step 2: Address only evidence-backed blockers**

If reviewer finds a concrete issue, make the smallest targeted change and rerun:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Final verification before reporting completion**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: PASS.

Then repeat Task 4 manual checks before claiming the bugs are fixed.

---

## Self-Review

- Spec coverage: Task 2 fixes drag drift by eliminating renderer client/window coordinate mixing. Task 3 fixes incorrect vertical gaze center. Task 4 covers manual verification for the two reported bugs and basic regressions. Task 5 covers adversarial review.
- Placeholder scan: no TBD/TODO/fill-later placeholders remain.
- Type consistency: `PetDragStartPayload` is consistently narrowed to `screenX/screenY`; `grabOffset` lives only in main-process drag state; `PetPointerMovePayload` remains unchanged.
