import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultPetBehaviorSettings, normalizePetBehaviorSettings } from './settings'

test('creates default pet behavior settings', () => {
  const settings = createDefaultPetBehaviorSettings()

  assert.equal(settings.bubbleDurationSeconds, 10)
  assert.equal(settings.idleSpeechIntervalSeconds, 30)
})

test('normalizes invalid pet behavior settings', () => {
  const settings = normalizePetBehaviorSettings({
    bubbleDurationSeconds: -5,
    idleSpeechIntervalSeconds: 0
  })

  assert.equal(settings.bubbleDurationSeconds, 10)
  assert.equal(settings.idleSpeechIntervalSeconds, 30)
})

test('clamps pet behavior settings into supported ranges', () => {
  const settings = normalizePetBehaviorSettings({
    bubbleDurationSeconds: 999,
    idleSpeechIntervalSeconds: 2
  })

  assert.equal(settings.bubbleDurationSeconds, 120)
  assert.equal(settings.idleSpeechIntervalSeconds, 5)
})
