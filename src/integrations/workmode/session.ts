import type { WorkEventPayload, WorkModeState, WorkTool } from '../../shared/types/pet'

const defaultSummary = {
  errorCount: 0,
  recentFiles: [],
  lastCompletedAt: null,
  lastActiveAt: null
} satisfies WorkModeState['summary']

export class WorkModeSession {
  private state: WorkModeState = {
    enabled: false,
    tool: 'claude-code',
    status: 'disabled',
    lastEvent: null,
    connection: 'idle',
    summary: defaultSummary,
    server: {
      port: null
    }
  }

  getState(): WorkModeState {
    return this.state
  }

  setEnabled(enabled: boolean): WorkModeState {
    this.state = {
      ...this.state,
      enabled,
      status: enabled ? 'tool.idle' : 'disabled'
    }

    return this.state
  }

  setTool(tool: WorkTool): WorkModeState {
    this.state = {
      ...this.state,
      tool
    }

    return this.state
  }

  setPort(port: number): void {
    this.state = {
      ...this.state,
      connection: port > 0 ? 'listening' : 'idle',
      server: {
        port
      }
    }
  }

  applyEvent(event: WorkEventPayload): WorkModeState {
    if (!this.state.enabled) {
      return this.state
    }

    const recentFiles = event.filePath
      ? [event.filePath, ...this.state.summary.recentFiles.filter((filePath) => filePath !== event.filePath)].slice(0, 5)
      : this.state.summary.recentFiles

    this.state = {
      ...this.state,
      status: event.type,
      lastEvent: event,
      summary: {
        errorCount: this.state.summary.errorCount + (event.type === 'tool.error' ? 1 : 0),
        recentFiles,
        lastCompletedAt: event.type === 'tool.complete' ? event.timestamp : this.state.summary.lastCompletedAt,
        lastActiveAt: event.timestamp
      }
    }

    return this.state
  }
}
