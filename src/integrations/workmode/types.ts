export type WorkTool = 'claude-code'

export type WorkEventType =
  | 'tool.started'
  | 'tool.thinking'
  | 'tool.file_edit'
  | 'tool.error'
  | 'tool.complete'
  | 'tool.idle'

export interface WorkEventPayload {
  tool: WorkTool
  type: WorkEventType
  message: string
  filePath?: string
  timestamp: string
}

export interface WorkModeState {
  enabled: boolean
  tool: WorkTool
  status: WorkEventType | 'disabled'
  lastEvent: WorkEventPayload | null
  server: {
    port: number | null
  }
}
