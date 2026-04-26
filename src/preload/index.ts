import { contextBridge, ipcRenderer } from 'electron'
import type { AppInfo } from '../shared/types/app'
import type { ModelConfigInput } from '../shared/types/model-config'
import type { PetAnimationState, PetDragStartPayload, PetPointerMovePayload, PetSnapshot, TodoScope, WorkEventPayload, WorkTool } from '../shared/types/pet'

const appInfo: AppInfo = {
  name: 'PawDesk',
  version: '0.1.0',
  environment: process.env['NODE_ENV'] ?? 'development'
}

contextBridge.exposeInMainWorld('pawdesk', {
  getAppInfo: () => appInfo,
  ping: async () => 'pong',
  pet: {
    getSnapshot: () => ipcRenderer.invoke('pet:get-snapshot'),
    addTodo: (title: string, scope: TodoScope) => ipcRenderer.invoke('pet:add-todo', title, scope),
    toggleTodo: (todoId: string) => ipcRenderer.invoke('pet:toggle-todo', todoId),
    removeTodo: (todoId: string) => ipcRenderer.invoke('pet:remove-todo', todoId),
    sendChat: (text: string) => ipcRenderer.invoke('pet:send-chat', text),
    clearBubble: () => ipcRenderer.invoke('pet:clear-bubble'),
    saveModelConfig: (config: ModelConfigInput) => ipcRenderer.invoke('pet:save-model-config', config),
    activateModelConfig: (id: string) => ipcRenderer.invoke('pet:activate-model-config', id),
    toggleWorkMode: (enabled: boolean) => ipcRenderer.invoke('pet:toggle-work-mode', enabled),
    setWorkTool: (tool: WorkTool) => ipcRenderer.invoke('pet:set-work-tool', tool),
    sendWorkEvent: (payload: WorkEventPayload) => ipcRenderer.invoke('pet:send-work-event', payload),
    pointerDown: (payload: PetDragStartPayload) => {
      ipcRenderer.send('pet:pointer-down', payload)
    },
    pointerMove: () => {
      ipcRenderer.send('pet:pointer-move')
    },
    pointerUp: () => {
      ipcRenderer.send('pet:pointer-up')
    },
    onAnimationStateChange: (callback: (state: PetAnimationState) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: PetAnimationState) => {
        callback(state)
      }

      ipcRenderer.on('pet:animation-state', listener)

      return () => {
        ipcRenderer.removeListener('pet:animation-state', listener)
      }
    },
    onSnapshotChange: (callback: (snapshot: PetSnapshot) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, snapshot: PetSnapshot) => {
        callback(snapshot)
      }

      ipcRenderer.on('pet:snapshot', listener)

      return () => {
        ipcRenderer.removeListener('pet:snapshot', listener)
      }
    },
    onPointerMove: (callback: (payload: PetPointerMovePayload) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: PetPointerMovePayload) => {
        callback(payload)
      }

      ipcRenderer.on('pet:pointer-move', listener)

      return () => {
        ipcRenderer.removeListener('pet:pointer-move', listener)
      }
    }
  }
})
