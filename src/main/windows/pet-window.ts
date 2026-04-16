import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'

export const PET_WINDOW_SIZE = {
  width: 196,
  height: 272
} as const

export function createPetWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  const window = new BrowserWindow({
    width: PET_WINDOW_SIZE.width,
    height: PET_WINDOW_SIZE.height,
    x: width - PET_WINDOW_SIZE.width - 48,
    y: height - PET_WINDOW_SIZE.height - 72,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: false,
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  window.on('ready-to-show', () => {
    window.showInactive()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}
