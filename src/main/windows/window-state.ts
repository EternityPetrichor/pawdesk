import type { BrowserWindow } from 'electron'
import type { PetPosition } from '../../shared/types/pet'

export function syncWindowPositions(window: BrowserWindow, position: PetPosition): void {
  window.setPosition(position.x, position.y)
}

export function getWindowPosition(window: BrowserWindow): PetPosition {
  const [x, y] = window.getPosition()
  return { x, y }
}
