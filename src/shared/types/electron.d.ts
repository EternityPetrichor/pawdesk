import type { AppInfo } from '../shared/types/app'
import type { ModelConfig } from '../shared/types/model-config'
import type { PetAnimationState, PetPointerMovePayload, PetSnapshot, TodoScope, WorkEventPayload, WorkTool } from '../shared/types/pet'

declare global {
  interface Window {
    pawdesk: {
      getAppInfo: () => AppInfo
      ping: () => Promise<string>
      pet: {
        getSnapshot: () => Promise<PetSnapshot>
        addTodo: (title: string, scope: TodoScope) => Promise<PetSnapshot>
        toggleTodo: (todoId: string) => Promise<PetSnapshot>
        removeTodo: (todoId: string) => Promise<PetSnapshot>
        sendChat: (text: string) => Promise<PetSnapshot>
        clearBubble: () => Promise<PetSnapshot>
        saveModelConfig: (config: ModelConfig) => Promise<PetSnapshot>
        toggleWorkMode: (enabled: boolean) => Promise<PetSnapshot>
        setWorkTool: (tool: WorkTool) => Promise<PetSnapshot>
        sendWorkEvent: (payload: WorkEventPayload) => Promise<PetSnapshot>
        pointerDown: (payload: { screenX: number; screenY: number; offsetX: number; offsetY: number }) => void
        pointerMove: () => void
        pointerUp: () => void
        onAnimationStateChange: (callback: (state: PetAnimationState) => void) => () => void
        onSnapshotChange: (callback: (snapshot: PetSnapshot) => void) => () => void
        onPointerMove: (callback: (payload: PetPointerMovePayload) => void) => () => void
      }
    }
  }
}

export {}
