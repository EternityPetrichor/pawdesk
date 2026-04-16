import { BrowserWindow } from 'electron'
import { join } from 'node:path'

export function createPanelWindow(panel: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 880,
    height: 640,
    minWidth: 720,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    title: 'PawDesk 控制面板',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?panel=${panel}`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), {
      search: `panel=${panel}`
    })
  }

  return window
}
