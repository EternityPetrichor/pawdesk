# Pawdesk Delta-Based Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragile absolute drag anchor with delta-based movement so clockwise circular dragging no longer drifts right or crashes the Electron main process.

**Architecture:** The main process is the single authority for drag coordinates. On pointer down, record the current main-process cursor as `lastCursor`; on each drag tick, compute `dx/dy` from the current main-process cursor minus `lastCursor`, move the real current BrowserWindow position by that delta, then update `lastCursor`. All coordinates passed to `setPosition` must be finite numbers so invalid IPC payloads cannot crash the main process.

**Tech Stack:** Electron 35, React 19, TypeScript 5, electron-vite, pnpm, existing `pnpm typecheck` verification.

---

## Files and Responsibilities

- Modify `src/main/ipc/pet-events.ts`: replace `startCursor/grabOffset` absolute-anchor state with `lastCursor` delta state; add finite guards before `setPosition`.
- Do not modify renderer, preload, shared types, eye tracking, docs, or global pointer broadcasting in this pass.
- Do not commit automatically. Stop after implementation, review, and verification results.

---

### Task 1: Replace absolute-anchor drag with delta-based drag

**Files:**
- Modify: `src/main/ipc/pet-events.ts`

- [ ] **Step 1: Confirm the current failure mode in code**

Inspect `src/main/ipc/pet-events.ts`. The current fragile path is:

```ts
startCursor: { screenX: number; screenY: number } | null
grabOffset: { x: number; y: number } | null
latestCursor: { screenX: number; screenY: number } | null
```

and later:

```ts
const nextPosition = {
  x: Math.round(cursor.screenX - dragState.grabOffset.x),
  y: Math.round(cursor.screenY - dragState.grabOffset.y)
}
```

This is the behavior to remove.

- [ ] **Step 2: Update `DragState`**

Replace the drag-only state fields with:

```ts
interface DragState {
  active: boolean
  dragging: boolean
  lastCursor: { screenX: number; screenY: number } | null
  latestPosition: { x: number; y: number } | null
  pollTimer: NodeJS.Timeout | null
}
```

- [ ] **Step 3: Update initial drag state**

Replace the `dragState` initializer with:

```ts
  const dragState: DragState = {
    active: false,
    dragging: false,
    lastCursor: null,
    latestPosition: null,
    pollTimer: null
  }
```

- [ ] **Step 4: Add a finite-number helper**

Add this helper near the top of `registerPetEvents`, before `updateDragPosition`:

```ts
  const isFinitePoint = (point: { x: number; y: number }) => {
    return Number.isFinite(point.x) && Number.isFinite(point.y)
  }
```

- [ ] **Step 5: Replace `updateDragPosition` with delta-based movement**

Replace the whole `updateDragPosition` function with:

```ts
  const updateDragPosition = () => {
    if (!dragState.active || !dragState.lastCursor) {
      return
    }

    const cursorPoint = screen.getCursorScreenPoint()
    const cursor = {
      screenX: cursorPoint.x,
      screenY: cursorPoint.y
    }

    if (!Number.isFinite(cursor.screenX) || !Number.isFinite(cursor.screenY)) {
      stopDragPolling()
      dragState.active = false
      dragState.dragging = false
      dragState.lastCursor = null
      dragState.latestPosition = null
      return
    }

    const dx = cursor.screenX - dragState.lastCursor.screenX
    const dy = cursor.screenY - dragState.lastCursor.screenY

    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      stopDragPolling()
      dragState.active = false
      dragState.dragging = false
      dragState.lastCursor = null
      dragState.latestPosition = null
      return
    }

    if (!dragState.dragging && Math.hypot(dx, dy) > 2) {
      dragState.dragging = true
    }

    if (dx === 0 && dy === 0) {
      return
    }

    const [windowX, windowY] = petWindow.getPosition()
    const nextPosition = {
      x: Math.round(windowX + dx),
      y: Math.round(windowY + dy)
    }

    if (!isFinitePoint(nextPosition)) {
      stopDragPolling()
      dragState.active = false
      dragState.dragging = false
      dragState.lastCursor = null
      dragState.latestPosition = null
      return
    }

    dragState.lastCursor = cursor
    dragState.latestPosition = nextPosition
    petWindow.setPosition(nextPosition.x, nextPosition.y)
    const [petWidth, petHeight] = petWindow.getSize()
    broadcastPointerPosition({
      screenX: cursor.screenX,
      screenY: cursor.screenY,
      petX: nextPosition.x,
      petY: nextPosition.y,
      petWidth,
      petHeight
    })
  }
```

- [ ] **Step 6: Replace `pointer-down` initialization**

Replace the `ipcMain.on('pet:pointer-down', ...)` block with:

```ts
  ipcMain.on('pet:pointer-down', () => {
    const cursorPoint = screen.getCursorScreenPoint()
    const cursor = {
      screenX: cursorPoint.x,
      screenY: cursorPoint.y
    }

    if (!Number.isFinite(cursor.screenX) || !Number.isFinite(cursor.screenY)) {
      return
    }

    const [x, y] = petWindow.getPosition()
    const position = { x: Number(x), y: Number(y) }

    if (!isFinitePoint(position)) {
      return
    }

    dragState.active = true
    dragState.dragging = false
    dragState.lastCursor = cursor
    dragState.latestPosition = position
    startDragPolling()
  })
```

This intentionally ignores renderer `payload.screenX/Y` for drag math so the drag path uses only main-process cursor/window coordinates.

- [ ] **Step 7: Update `pointer-up` cleanup**

In `ipcMain.on('pet:pointer-up', ...)`, replace cleanup fields:

```ts
    dragState.active = false
    dragState.dragging = false
    dragState.lastCursor = null
    dragState.latestPosition = null
```

There should be no remaining references to `startCursor`, `grabOffset`, or `latestCursor`.

- [ ] **Step 8: Run typecheck**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: PASS.

- [ ] **Step 9: Run build if dependencies are healthy**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm build
```

Expected: PASS if Rollup optional native dependency is installed. If it fails with missing `@rollup/rollup-linux-x64-gnu`, report it as an environment dependency issue, not a code blocker.

- [ ] **Step 10: Review scoped diff**

Run:

```bash
git -C /mnt/d/Study/cc/pawdesk diff -- src/main/ipc/pet-events.ts
```

Expected: only `src/main/ipc/pet-events.ts` changes for this plan.

---

### Task 2: Manual verification and stop

**Files:**
- No source changes.

- [ ] **Step 1: Start the app**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm dev
```

Expected: Electron app opens successfully. If Electron/Rollup dependencies fail, report the environment error and stop.

- [ ] **Step 2: Verify crash is gone**

Manual checks:

- Drag clockwise in tight circles for 20 seconds.
- Drag clockwise in larger circles for 20 seconds.
- Repeat with fast start/stop motions.

Expected: no main-process `setPosition` conversion failure dialog.

- [ ] **Step 3: Verify clockwise right drift**

Manual checks:

- Press near body center and drag clockwise circles for 10-15 seconds.
- Press left side and drag clockwise circles for 10-15 seconds.
- Press right side and drag clockwise circles for 10-15 seconds.
- Compare counterclockwise circles.

Expected: no progressive right drift; clockwise should not be noticeably worse than counterclockwise.

- [ ] **Step 4: Verify regressions**

Manual checks:

- Fast straight left-right drag still keeps pet under cursor.
- Stop with cursor below eyes and confirm eyes still look down.
- Click without dragging and confirm poke still works.

Expected: no regression in straight dragging, gaze, or click interaction.

- [ ] **Step 5: Stop and report**

Report exactly one outcome:

```text
B_SUFFICIENT: delta-based drag fixes circular drift and crash in manual verification.
```

or

```text
B_INSUFFICIENT: delta-based drag still drifts or crashes; include reproduction details.
```

Do not continue into hit-window or larger architecture changes in this plan.

---

## Self-Review

- Spec coverage: Task 1 rolls back A's renderer-payload anchor dependency, implements main-process delta-based drag, and adds finite guards before `setPosition`. Task 2 covers crash, circular drift, and regression verification.
- Placeholder scan: no TBD/TODO/fill-later placeholders remain.
- Type consistency: `DragState` uses `lastCursor` only; `startCursor`, `grabOffset`, and `latestCursor` must not remain after Task 1.
