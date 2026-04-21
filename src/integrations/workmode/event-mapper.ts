import type { WorkEventPayload } from '../../shared/types/pet'
import type { RawWorkEventInput } from './types'

export function mapRawWorkEvent(input: RawWorkEventInput): WorkEventPayload {
  const eventName = input.eventName.trim()

  if (input.tool === 'claude-code' && eventName === 'PreToolUse') {
    return {
      tool: input.tool,
      type: input.filePath ? 'tool.file_edit' : 'tool.thinking',
      message: input.message ?? eventName,
      filePath: input.filePath,
      timestamp: input.timestamp
    }
  }

  if (input.tool === 'codex' && eventName === 'exec_approval_request') {
    return {
      tool: input.tool,
      type: 'tool.waiting_permission',
      message: input.message ?? eventName,
      timestamp: input.timestamp
    }
  }

  if (input.tool === 'codex' && eventName === 'turn_complete') {
    return {
      tool: input.tool,
      type: 'tool.complete',
      message: input.message ?? eventName,
      timestamp: input.timestamp
    }
  }

  return {
    tool: input.tool,
    type: 'tool.idle',
    message: input.message ?? eventName,
    filePath: input.filePath,
    timestamp: input.timestamp
  }
}
