import type { WorkEventPayload } from './types'

export function mapWorkEvent(payload: WorkEventPayload): WorkEventPayload {
  return {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
    message: payload.message || ''
  }
}
