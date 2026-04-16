import { useEffect, useRef } from 'react'
import { ChatBubble } from './ChatBubble'
import { useAnimationState } from './animation-controller'
import { usePetSnapshot } from './usePetSnapshot'
import { usePointerTracking } from './usePointerTracking'

export function PetCanvas() {
  const snapshot = usePetSnapshot()
  const animationState = useAnimationState()
  const pointerOffset = usePointerTracking()
  const draggingRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    const handleWindowPointerUp = (event?: PointerEvent) => {
      if (!draggingRef.current || !window.pawdesk?.pet) {
        return
      }

      if (event && activePointerIdRef.current !== event.pointerId) {
        return
      }

      draggingRef.current = false
      activePointerIdRef.current = null
      window.pawdesk.pet.pointerUp()
    }

    const handleWindowBlur = () => {
      handleWindowPointerUp()
    }

    window.addEventListener('pointerup', handleWindowPointerUp)
    window.addEventListener('pointercancel', handleWindowPointerUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp)
      window.removeEventListener('pointercancel', handleWindowPointerUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !window.pawdesk?.pet) {
      return
    }

    draggingRef.current = true
    activePointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    window.pawdesk.pet.pointerDown({
      screenX: event.screenX,
      screenY: event.screenY,
      offsetX: event.clientX,
      offsetY: event.clientY
    })
  }

  return (
    <main className="pet-app">
      <ChatBubble bubble={snapshot?.chat.currentBubble ?? null} />

      <div className={`pet-scene state-${animationState}`}>
        <div className="pet-shadow" />
        <div className="pet-body" onPointerDown={handlePointerDown}>
          <div className="pet-ear pet-ear-left" />
          <div className="pet-ear pet-ear-right" />
          <div className="pet-face">
            <div className="pet-eye">
              <span
                className="pet-pupil"
                style={{ transform: `translate(${pointerOffset.x}px, ${pointerOffset.y}px)` }}
              />
            </div>
            <div className="pet-eye">
              <span
                className="pet-pupil"
                style={{ transform: `translate(${pointerOffset.x}px, ${pointerOffset.y}px)` }}
              />
            </div>
          </div>
          <div className="pet-nose" />
          <div className="pet-mouth" />
          <div className="pet-tail" />
        </div>
      </div>
    </main>
  )
}
