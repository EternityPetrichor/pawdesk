export function useWorkModeActions() {
  return {
    toggleWorkMode: async (enabled: boolean) => window.pawdesk.pet.toggleWorkMode(enabled),
    setWorkTool: async (tool: 'claude-code') => window.pawdesk.pet.setWorkTool(tool),
    sendWorkEvent: async (payload: {
      tool: 'claude-code'
      type:
        | 'tool.started'
        | 'tool.thinking'
        | 'tool.file_edit'
        | 'tool.error'
        | 'tool.complete'
        | 'tool.idle'
      message: string
      filePath?: string
      timestamp: string
    }) => window.pawdesk.pet.sendWorkEvent(payload)
  }
}
