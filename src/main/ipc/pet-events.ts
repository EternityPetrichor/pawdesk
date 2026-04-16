import { ipcMain, screen } from 'electron'
import type { PetDragStartPayload, PetPointerMovePayload, TodoScope } from '../../shared/types/pet'
import type { PetSession } from '../pet/pet-session'

interface DragState {
  active: boolean
  dragging: boolean
  startCursor: { screenX: number; screenY: number; offsetX: number; offsetY: number } | null
  latestCursor: { screenX: number; screenY: number; offsetX: number; offsetY: number } | null
  latestPosition: { x: number; y: number } | null
  pollTimer: NodeJS.Timeout | null
}

export function registerPetEvents(petWindow: Electron.BrowserWindow, petSession: PetSession): void {
  const dragState: DragState = {
    active: false,
    dragging: false,
    startCursor: null,
    latestCursor: null,
    latestPosition: null,
    pollTimer: null
  }

  const stopDragPolling = () => {
    if (!dragState.pollTimer) {
      return
    }

    clearInterval(dragState.pollTimer)
    dragState.pollTimer = null
  }

  const broadcastPointerPosition = (payload: PetPointerMovePayload) => {
    if (petWindow.isDestroyed()) {
      return
    }

    petWindow.webContents.send('pet:pointer-move', payload)
  }

  const updateDragPosition = () => {
    if (!dragState.active || !dragState.startCursor) {
      return
    }

    const cursorPoint = screen.getCursorScreenPoint()
    dragState.latestCursor = {
      screenX: cursorPoint.x,
      screenY: cursorPoint.y,
      offsetX: dragState.startCursor.offsetX,
      offsetY: dragState.startCursor.offsetY
    }

    const cursor = dragState.latestCursor
    const dx = cursor.screenX - dragState.startCursor.screenX
    const dy = cursor.screenY - dragState.startCursor.screenY

    if (!dragState.dragging && Math.hypot(dx, dy) > 2) {
      dragState.dragging = true
    }

    const nextPosition = {
      x: Math.round(cursor.screenX - dragState.startCursor.offsetX),
      y: Math.round(cursor.screenY - dragState.startCursor.offsetY)
    }

    if (
      dragState.latestPosition &&
      dragState.latestPosition.x === nextPosition.x &&
      dragState.latestPosition.y === nextPosition.y
    ) {
      return
    }

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

  const startDragPolling = () => {
    stopDragPolling()
    dragState.pollTimer = setInterval(updateDragPosition, 8)
  }

  ipcMain.handle('pet:get-snapshot', () => {
    return petSession.getSnapshot()
  })

  ipcMain.handle('pet:add-todo', (_event, title: string, scope: TodoScope) => {
    return petSession.addTodo(title, scope)
  })

  ipcMain.handle('pet:toggle-todo', (_event, todoId: string) => {
    return petSession.toggleTodo(todoId)
  })

  ipcMain.handle('pet:remove-todo', (_event, todoId: string) => {
    return petSession.removeTodo(todoId)
  })

  ipcMain.handle('pet:send-chat', (_event, text: string) => {
    return petSession.sendChat(text)
  })

  ipcMain.handle('pet:clear-bubble', () => {
    return petSession.clearCurrentBubble()
  })

  ipcMain.on('pet:pointer-down', (_event, payload: PetDragStartPayload) => {
    dragState.active = true
    dragState.dragging = false
    dragState.startCursor = {
      screenX: Number(payload.screenX),
      screenY: Number(payload.screenY),
      offsetX: Number(payload.offsetX),
      offsetY: Number(payload.offsetY)
    }
    dragState.latestCursor = dragState.startCursor

    const [x, y] = petWindow.getPosition()
    dragState.latestPosition = { x: Number(x), y: Number(y) }
    startDragPolling()
  })

  ipcMain.on('pet:pointer-move', () => {
    if (!dragState.active) {
      return
    }

    updateDragPosition()
  })

  ipcMain.on('pet:pointer-up', () => {
    if (!dragState.active) {
      return
    }

    stopDragPolling()
    updateDragPosition()

    const dragging = dragState.dragging
    const latestPosition = dragState.latestPosition

    dragState.active = false
    dragState.dragging = false
    dragState.startCursor = null
    dragState.latestCursor = null
    dragState.latestPosition = null

    if (!dragging) {
      void petSession.applyInteraction('poke')
      return
    }

    if (latestPosition) {
      void petSession.updatePosition(latestPosition)
    }
  })
}
