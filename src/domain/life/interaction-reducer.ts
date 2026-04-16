import { lifeConfig } from './defaults'
import type { PetInteractionType, PetLifeStats } from './types'

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

export function applyInteraction(
  stats: PetLifeStats,
  interaction: PetInteractionType,
  now: Date = new Date()
): PetLifeStats {
  const delta = lifeConfig.interactions[interaction]

  return {
    mood: clamp(stats.mood + delta.mood),
    energy: clamp(stats.energy + delta.energy),
    hunger: clamp(stats.hunger + delta.hunger),
    intimacy: clamp(stats.intimacy + delta.intimacy),
    lastUpdatedAt: now.toISOString()
  }
}
