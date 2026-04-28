export interface PetBehaviorSettings {
  bubbleDurationSeconds: number
  idleSpeechIntervalSeconds: number
}

const DEFAULT_BUBBLE_DURATION_SECONDS = 10
const DEFAULT_IDLE_SPEECH_INTERVAL_SECONDS = 30
const MIN_BUBBLE_DURATION_SECONDS = 3
const MAX_BUBBLE_DURATION_SECONDS = 120
const MIN_IDLE_SPEECH_INTERVAL_SECONDS = 5
const MAX_IDLE_SPEECH_INTERVAL_SECONDS = 600

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

export function createDefaultPetBehaviorSettings(): PetBehaviorSettings {
  return {
    bubbleDurationSeconds: DEFAULT_BUBBLE_DURATION_SECONDS,
    idleSpeechIntervalSeconds: DEFAULT_IDLE_SPEECH_INTERVAL_SECONDS
  }
}

export function normalizePetBehaviorSettings(value: unknown): PetBehaviorSettings {
  const defaults = createDefaultPetBehaviorSettings()
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const bubbleDurationSeconds = readPositiveNumber(record.bubbleDurationSeconds)
  const idleSpeechIntervalSeconds = readPositiveNumber(record.idleSpeechIntervalSeconds)

  return {
    bubbleDurationSeconds:
      bubbleDurationSeconds === null
        ? defaults.bubbleDurationSeconds
        : clamp(Math.round(bubbleDurationSeconds), MIN_BUBBLE_DURATION_SECONDS, MAX_BUBBLE_DURATION_SECONDS),
    idleSpeechIntervalSeconds:
      idleSpeechIntervalSeconds === null
        ? defaults.idleSpeechIntervalSeconds
        : clamp(
            Math.round(idleSpeechIntervalSeconds),
            MIN_IDLE_SPEECH_INTERVAL_SECONDS,
            MAX_IDLE_SPEECH_INTERVAL_SECONDS
          )
  }
}
