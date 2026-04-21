import test from 'node:test'
import assert from 'node:assert/strict'
import { WorkModeSession } from './session'

const startedAt = '2026-04-21T09:00:00.000Z'
const fileEditAt = '2026-04-21T09:05:00.000Z'
const errorAt = '2026-04-21T09:06:00.000Z'
const completeAt = '2026-04-21T09:10:00.000Z'

test('ignores work events while disabled', () => {
  const session = new WorkModeSession()

  session.applyEvent({
    tool: 'claude-code',
    type: 'tool.thinking',
    message: 'thinking',
    timestamp: startedAt
  })

  assert.deepEqual(session.getState(), {
    enabled: false,
    tool: 'claude-code',
    status: 'disabled',
    lastEvent: null,
    connection: 'idle',
    summary: {
      errorCount: 0,
      recentFiles: [],
      lastCompletedAt: null,
      lastActiveAt: null
    },
    server: {
      port: null
    }
  })
})

test('switches tools and keeps selected provider in state', () => {
  const session = new WorkModeSession()
  session.setEnabled(true)

  const nextState = session.setTool('codex')

  assert.equal(nextState.tool, 'codex')
  assert.equal(nextState.status, 'tool.idle')
})

test('tracks recent files, error count, and last completion in summary', () => {
  const session = new WorkModeSession()
  session.setEnabled(true)
  session.setTool('cursor')

  session.applyEvent({
    tool: 'cursor',
    type: 'tool.started',
    message: 'started',
    timestamp: startedAt
  })
  session.applyEvent({
    tool: 'cursor',
    type: 'tool.file_edit',
    message: 'editing',
    filePath: 'src/main/pet/pet-session.ts',
    timestamp: fileEditAt
  })
  session.applyEvent({
    tool: 'cursor',
    type: 'tool.error',
    message: 'boom',
    timestamp: errorAt
  })
  const nextState = session.applyEvent({
    tool: 'cursor',
    type: 'tool.complete',
    message: 'done',
    timestamp: completeAt
  })

  assert.equal(nextState.summary.errorCount, 1)
  assert.equal(nextState.summary.lastCompletedAt, completeAt)
  assert.deepEqual(nextState.summary.recentFiles, ['src/main/pet/pet-session.ts'])
  assert.equal(nextState.summary.lastActiveAt, completeAt)
})

test('sets listening connection state after server port is configured', () => {
  const session = new WorkModeSession()
  session.setEnabled(true)

  session.setPort(23333)

  assert.equal(session.getState().connection, 'listening')
  assert.equal(session.getState().server.port, 23333)
})
