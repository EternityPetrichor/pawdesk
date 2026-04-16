import type { WorkEventPayload } from '../types'

export function normalizeClaudeCodeEvent(payload: Partial<WorkEventPayload>): WorkEventPayload {
  return {
    tool: 'claude-code',
    type: payload.type ?? 'tool.idle',
    message: payload.message ?? '',
    filePath: payload.filePath,
    timestamp: payload.timestamp ?? new Date().toISOString()
  }
}
