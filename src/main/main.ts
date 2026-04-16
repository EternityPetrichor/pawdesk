import { app, BrowserWindow, screen } from 'electron'
import type { PetPointerMovePayload } from '../shared/types/pet'
import { registerPetEvents } from './ipc/pet-events'
import { attachPetContextMenu } from './menu/pet-context-menu'
import { PetSession } from './pet/pet-session'
import { createPetWindow } from './windows/pet-window'

async function bootstrapPetWindow(): Promise<void> {
  const petWindow = createPetWindow()
  const [x, y] = petWindow.getPosition()
  const petSession = new PetSession(petWindow)

  await petSession.initialize({ x, y })
  registerPetEvents(petWindow, petSession)
  attachPetContextMenu(petWindow, petSession)
  startGlobalPointerTracking(petWindow)
}

function startGlobalPointerTracking(petWindow: BrowserWindow): void {
  let lastPayload: PetPointerMovePayload | null = null

  setInterval(() => {
    if (petWindow.isDestroyed()) {
      return
    }

    const cursor = screen.getCursorScreenPoint()
    const [petX, petY] = petWindow.getPosition()
    const [petWidth, petHeight] = petWindow.getSize()
    const nextPayload: PetPointerMovePayload = {
      screenX: cursor.x,
      screenY: cursor.y,
      petX,
      petY,
      petWidth,
      petHeight
    }

    if (
      lastPayload &&
      lastPayload.screenX === nextPayload.screenX &&
      lastPayload.screenY === nextPayload.screenY &&
      lastPayload.petX === nextPayload.petX &&
      lastPayload.petY === nextPayload.petY &&
      lastPayload.petWidth === nextPayload.petWidth &&
      lastPayload.petHeight === nextPayload.petHeight
    ) {
      return
    }

    lastPayload = nextPayload
    petWindow.webContents.send('pet:pointer-move', nextPayload)
  }, 50)
}

app.whenReady().then(async () => {
  await bootstrapPetWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await bootstrapPetWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
