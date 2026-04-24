import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeModelConfigForSave, normalizeModelConfig, toModelConfigSnapshot } from './model-config-store'

test('normalizes missing config to local template', () => {
  const config = normalizeModelConfig(null)

  assert.equal(config.provider, 'local-template')
  assert.equal(config.protocol, 'local-template')
  assert.equal(config.model, 'template-v1')
  assert.equal(config.apiKey, '')
})

test('migrates old claude config to anthropic messages', () => {
  const config = normalizeModelConfig({
    enabled: true,
    mode: 'claude',
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    baseUrl: 'https://api.anthropic.com',
    apiKey: 'secret'
  })

  assert.equal(config.provider, 'anthropic')
  assert.equal(config.protocol, 'anthropic-messages')
  assert.equal(config.apiKey, 'secret')
})

test('fills built-in provider defaults', () => {
  const config = normalizeModelConfig({ provider: 'gemini', apiKey: 'key' })

  assert.equal(config.protocol, 'openai-chat')
  assert.equal(config.model, 'gemini-2.0-flash')
  assert.equal(config.baseUrl, 'https://generativelanguage.googleapis.com/v1beta/openai')
})

test('preserves existing key when unchanged remote config submits empty key', () => {
  const current = normalizeModelConfig({ provider: 'openai', apiKey: 'saved-key' })
  const next = mergeModelConfigForSave(current, { ...current, apiKey: '' })

  assert.equal(next.apiKey, 'saved-key')
})

test('clearApiKey clears existing key', () => {
  const current = normalizeModelConfig({ provider: 'openai', apiKey: 'saved-key' })
  const next = mergeModelConfigForSave(current, { ...current, apiKey: '', clearApiKey: true })

  assert.equal(next.apiKey, '')
})

test('snapshot never exposes api key', () => {
  const snapshot = toModelConfigSnapshot(normalizeModelConfig({ provider: 'openai', apiKey: 'secret' }))

  assert.equal(snapshot.hasApiKey, true)
  assert.equal('apiKey' in snapshot, false)
})
