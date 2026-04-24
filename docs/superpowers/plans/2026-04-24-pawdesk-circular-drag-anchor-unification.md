# Pawdesk Circular Drag Anchor Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining clockwise circular-drag right drift by making drag-start initialization use one coordinate source for both `startCursor` and `grabOffset`.

**Architecture:** Keep the current absolute drag model (`cursor - grabOffset`) for now, but fix the highest-confidence defect: drag start currently mixes renderer event coordinates with a separately sampled main-process cursor coordinate. The implementation should make `startCursor`, `grabOffset`, and `latestCursor` all derive from the same `pointer-down` payload, then verify whether that removes the systematic right drift before considering larger delta-based drag changes.

**Tech Stack:** Electron 35, React 19, TypeScript 5, electron-vite, pnpm, existing `pnpm typecheck` and `pnpm build` verification.

---

## Files and Responsibilities

- Modify `src/main/ipc/pet-events.ts`: unify drag-start initialization so `grabOffset` uses the renderer `pointer-down` payload instead of a fresh `screen.getCursorScreenPoint()` sample.
- Reuse existing files only. Do not change renderer drag flow, global pointer broadcast, or eye-tracking logic in this pass.
- Verification uses `pnpm typecheck`, `pnpm build`, and manual circular-drag validation in Electron.

---

### Task 1: Make drag-start initialization use one coordinate source

**Files:**
- Modify: `src/main/ipc/pet-events.ts:134-153`

- [ ] **Step 1: Write the failing test surrogate by creating the intended type-safe diff**

In `src/main/ipc/pet-events.ts`, replace the `pointer-down` initialization block so it no longer samples a fresh cursor point:

```ts
  ipcMain.on('pet:pointer-down', (_event, payload: PetDragStartPayload) => {
    dragState.active = true
    dragState.dragging = false

    const [x, y] = petWindow.getPosition()
    const pointerDownCursor = {
      screenX: Number(payload.screenX),
      screenY: Number(payload.screenY)
    }

    dragState.startCursor = pointerDownCursor
    dragState.grabOffset = {
      x: pointerDownCursor.screenX - x,
      y: pointerDownCursor.screenY - y
    }
    dragState.latestCursor = pointerDownCursor
    dragState.latestPosition = { x: Number(x), y: Number(y) }
    startDragPolling()
  })
```

This is the smallest change that forces `startCursor`, `grabOffset`, and `latestCursor` to come from one event-time coordinate source.

- [ ] **Step 2: Run typecheck to verify the change compiles**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Run production build to verify no runtime bundle breakage**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm build
```

Expected: PASS.

- [ ] **Step 4: Review the resulting diff for scope control**

Run:

```bash
git -C /mnt/d/Study/cc/pawdesk diff -- src/main/ipc/pet-events.ts
```

Expected: only the `pointer-down` initialization changes; no unrelated drag-path refactors.

- [ ] **Step 5: Commit the minimal anchor-unification change**

Run:

```bash
git -C /mnt/d/Study/cc/pawdesk add src/main/ipc/pet-events.ts
git -C /mnt/d/Study/cc/pawdesk commit -m "$(cat <<'EOF'
fix: unify circular drag start coordinates

Use one pointer-down coordinate source for drag anchor initialization so circular dragging no longer bakes in a skewed grab offset.
EOF
)"
```

Expected: commit succeeds with only the intended file staged.

---

### Task 2: Manually verify circular-drag behavior

**Files:**
- No source changes unless this verification proves Task 1 insufficient.

- [ ] **Step 1: Start the app**

Run:

```bash
cd /mnt/d/Study/cc/pawdesk && pnpm dev
```

Expected: Electron app opens successfully.

- [ ] **Step 2: Verify clockwise circular drag no longer drifts right**

Manual checks:

- Press near the center of the pet body and drag clockwise in tight circles for 10-15 seconds.
- Press near the left half of the pet body and repeat the same clockwise circular drag.
- Press near the right half of the pet body and repeat the same clockwise circular drag.

Expected: the pet remains visually centered under the intended circular path and does not gradually drift to the right.

- [ ] **Step 3: Compare clockwise vs counterclockwise behavior**

Manual checks:

- Perform the same circular motion counterclockwise for 10-15 seconds.
- Compare the final position error against the clockwise case.

Expected: no obvious directional bias remains; clockwise should no longer be noticeably worse.

- [ ] **Step 4: Re-check existing drag and gaze behavior**

Manual checks:

- Do a fast straight left-right drag and confirm the previous straight-drag improvement is preserved.
- Stop with the cursor below the pet eyes and confirm the already-fixed pupil direction still looks down.
- Click without dragging and confirm poke interaction still works.

Expected: no regressions in straight dragging, eye tracking, or click interactions.

---

### Task 3: Decide whether A was sufficient

**Files:**
- No source changes unless evidence shows Task 1 failed.

- [ ] **Step 1: Record the verification outcome explicitly**

Create a short result note in your working notes with exactly one of these conclusions:

```text
A_SUFFICIENT: clockwise circular drag drift is no longer reproducible in manual verification.
```

or

```text
A_INSUFFICIENT: clockwise circular drag drift still reproduces after anchor-unification.
```

- [ ] **Step 2: Stop after verification and report to the human**

If Task 1 works, report that A was sufficient and stop.

If Task 1 does not work, report that A was insufficient and stop without starting a delta-based rewrite. The next step would be a separate plan for B (`delta-based drag`), not additional speculative edits in this plan.

---

## Self-Review

- Spec coverage: Task 1 implements the chosen A strategy only — unify `pointer-down` coordinates for `startCursor`, `grabOffset`, and `latestCursor`. Task 2 verifies the exact clockwise circular-drag scenario plus regressions. Task 3 enforces the requested stop-and-report behavior after execution.
- Placeholder scan: no TBD/TODO/fill-later placeholders remain.
- Type consistency: `PetDragStartPayload` remains unchanged from the previous fix (`screenX`, `screenY` only), and Task 1 uses those values consistently for all drag-start state fields.
