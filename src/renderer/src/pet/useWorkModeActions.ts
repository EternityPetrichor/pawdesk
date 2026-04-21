import type { WorkEventPayload, WorkTool } from '../../../shared/types/pet'

export function useWorkModeActions() {
  return {
    toggleWorkMode: async (enabled: boolean) => window.pawdesk.pet.toggleWorkMode(enabled),
    setWorkTool: async (tool: WorkTool) => window.pawdesk.pet.setWorkTool(tool),
    sendWorkEvent: async (payload: WorkEventPayload) => window.pawdesk.pet.sendWorkEvent(payload)
  }
}
