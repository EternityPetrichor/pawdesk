import { lifeConfig } from './defaults'
import type { PetLifeStats } from './types'

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

export function settleLifeStats(stats: PetLifeStats, now: Date = new Date()): PetLifeStats {
  const lastUpdated = new Date(stats.lastUpdatedAt)
  const elapsedMs = now.getTime() - lastUpdated.getTime()

  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return {
      ...stats,
      lastUpdatedAt: now.toISOString()
    }
  }

  const elapsedHours = elapsedMs / (1000 * 60 * 60)

  return {
    mood: clamp(stats.mood - lifeConfig.ratesPerHour.moodDecay * elapsedHours),
    energy: clamp(stats.energy - lifeConfig.ratesPerHour.energyDecay * elapsedHours),
    hunger: clamp(stats.hunger + lifeConfig.ratesPerHour.hungerIncrease * elapsedHours),
    intimacy: clamp(stats.intimacy - lifeConfig.ratesPerHour.intimacyDecay * elapsedHours),
    lastUpdatedAt: now.toISOString()
  }
}
