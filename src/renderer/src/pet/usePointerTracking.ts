import { useEffect, useState } from 'react'
import type { PetPointerMovePayload } from '../../../shared/types/pet'

interface PointerOffset {
  x: number
  y: number
}

function clampEyeOffset(value: number): number {
  return Math.max(-8, Math.min(8, value))
}

export function usePointerTracking(): PointerOffset {
  const [offset, setOffset] = useState<PointerOffset>({ x: 0, y: 0 })

  useEffect(() => {
    if (!window.pawdesk?.pet) {
      return
    }

    return window.pawdesk.pet.onPointerMove((payload: PetPointerMovePayload) => {
      const centerX = (payload.petX ?? 0) + (payload.petWidth ?? window.innerWidth) / 2
      const centerY = (payload.petY ?? 0) + (payload.petHeight ?? window.innerHeight) / 2
      const nextOffset = {
        x: clampEyeOffset((payload.screenX - centerX) / 24),
        y: clampEyeOffset((payload.screenY - centerY) / 24)
      }

      setOffset((current) => {
        if (current.x === nextOffset.x && current.y === nextOffset.y) {
          return current
        }

        return nextOffset
      })
    })
  }, [])

  return offset
}
