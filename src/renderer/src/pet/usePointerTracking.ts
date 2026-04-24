import { useEffect, useState } from 'react'
import type { PetPointerMovePayload } from '../../../shared/types/pet'

interface PointerOffset {
  x: number
  y: number
}

const PET_SCENE_TOP = 92
const PET_FACE_TOP = 42
const PET_EYE_SIZE = 28
const EYE_ANCHOR_Y = PET_SCENE_TOP + PET_FACE_TOP + PET_EYE_SIZE / 2

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
      const petWidth = payload.petWidth ?? window.innerWidth
      const centerX = (payload.petX ?? 0) + petWidth / 2
      const centerY = (payload.petY ?? 0) + EYE_ANCHOR_Y
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
