import type { WorkTool } from '../../shared/types/pet'

export interface RawWorkEventInput {
  tool: WorkTool
  eventName: string
  message?: string
  filePath?: string
  timestamp: string
}
