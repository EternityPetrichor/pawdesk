import { BrowserWindow } from 'electron'

export function getFocusedWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow()
}
