import type { PetPosition, TaskReward } from '../../shared/types/pet'
import { refreshDailyTasks } from '../tasks/daily-tasks'
import { createTaskSummary } from '../tasks/task-state-machine'
import { createDefaultProfile } from './defaults'
import { derivePetState } from './derived-state'
import { applyInteraction } from './interaction-reducer'
import { settleLifeStats } from './life-calculator'
import type { PetInteractionType, PetProfile, PetSnapshot } from './types'

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

export function createSnapshot(profile: PetProfile): PetSnapshot {
  return {
    identity: profile.identity,
    stats: profile.stats,
    position: profile.position,
    derived: derivePetState(profile.stats),
    tasks: {
      ...profile.tasks,
      summary: createTaskSummary(profile.tasks)
    },
    chat: profile.chat,
    modelConfig: profile.modelConfig
  }
}

export function hydrateProfile(profile: PetProfile | null, now: Date = new Date()): PetProfile {
  const baseProfile = profile ?? createDefaultProfile(now)

  return {
    ...baseProfile,
    stats: settleLifeStats(baseProfile.stats, now),
    tasks: refreshDailyTasks(baseProfile.tasks, now)
  }
}

export function applyLifeInteraction(
  profile: PetProfile,
  interaction: PetInteractionType,
  now: Date = new Date()
): PetProfile {
  const settledStats = settleLifeStats(profile.stats, now)

  return {
    ...profile,
    stats: applyInteraction(settledStats, interaction, now)
  }
}

export function applyTaskReward(profile: PetProfile, reward: TaskReward, now: Date = new Date()): PetProfile {
  const settledStats = settleLifeStats(profile.stats, now)

  return {
    ...profile,
    stats: {
      mood: clamp(settledStats.mood + reward.mood),
      energy: clamp(settledStats.energy + reward.energy),
      hunger: clamp(settledStats.hunger + reward.hunger),
      intimacy: clamp(settledStats.intimacy + reward.intimacy),
      lastUpdatedAt: now.toISOString()
    }
  }
}

export function updateProfilePosition(profile: PetProfile, position: PetPosition): PetProfile {
  return {
    ...profile,
    position
  }
}
