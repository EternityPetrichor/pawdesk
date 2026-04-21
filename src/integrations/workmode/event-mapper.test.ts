import test from 'node:test'
import assert from 'node:assert/strict'
import { mapRawWorkEvent } from './event-mapper'

test('maps Claude Code tool events into normalized work events', () => {
  const event = mapRawWorkEvent({
    tool: 'claude-code',
    eventName: 'PreToolUse',
    message: 'editing file',
    filePath: 'src/domain/chat/chat-service.ts',
    timestamp: '2026-04-21T10:00:00.000Z'
  })

  assert.deepEqual(event, {
    tool: 'claude-code',
    type: 'tool.file_edit',
    message: 'editing file',
    filePath: 'src/domain/chat/chat-service.ts',
    timestamp: '2026-04-21T10:00:00.000Z'
  })
})

test('maps Codex approval and completion events into normalized work events', () => {
  const approval = mapRawWorkEvent({
    tool: 'codex',
    eventName: 'exec_approval_request',
    timestamp: '2026-04-21T10:01:00.000Z'
  })
  const complete = mapRawWorkEvent({
    tool: 'codex',
    eventName: 'turn_complete',
    timestamp: '2026-04-21T10:02:00.000Z'
  })

  assert.equal(approval.type, 'tool.waiting_permission')
  assert.equal(complete.type, 'tool.complete')
})

test('falls back to idle for unknown provider events', () => {
  const event = mapRawWorkEvent({
    tool: 'gemini',
    eventName: 'SomethingUnexpected',
    timestamp: '2026-04-21T10:03:00.000Z'
  })

  assert.deepEqual(event, {
    tool: 'gemini',
    type: 'tool.idle',
    message: 'SomethingUnexpected',
    filePath: undefined,
    timestamp: '2026-04-21T10:03:00.000Z'
  })
})
