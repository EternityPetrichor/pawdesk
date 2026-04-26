import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeProviderReply } from './sanitize'

test('removes XML style think blocks from provider replies', () => {
  const text = sanitizeProviderReply('<think>先分析一下</think>你好，我是小爪')

  assert.equal(text, '你好，我是小爪')
})

test('removes markdown fenced think blocks from provider replies', () => {
  const text = sanitizeProviderReply('```think\n推理过程\n```\n可以的')

  assert.equal(text, '可以的')
})
