import type { WorkEventPayload, WorkModeState, WorkTool } from './types'

export class WorkModeSession {
  private state: WorkModeState = {
    enabled: false,
    tool: 'claude-code',
    status: 'disabled',
    lastEvent: null,
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
      server: {
        port
      }
    }
  }

  applyEvent(event: WorkEventPayload): WorkModeState {
    if (!this.state.enabled) {
      return this.state
    }

    this.state = {
      ...this.state,
      status: event.type,
      lastEvent: event
    }

    return this.state
  }
}
