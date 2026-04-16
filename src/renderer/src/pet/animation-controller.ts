import { useMemo } from 'react'
import type { PetAnimationState } from '../../../shared/types/pet'
import { usePetSnapshot } from './usePetSnapshot'

export function useAnimationState(): PetAnimationState {
  const snapshot = usePetSnapshot()

  return useMemo(() => {
    return snapshot?.derived.animationState ?? 'idle'
  }, [snapshot])
}
