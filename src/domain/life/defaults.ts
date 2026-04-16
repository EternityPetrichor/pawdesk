import lifeConfigJson from '../../../config/life.json'
import { createDefaultChatState } from '../chat/defaults'
import { createDailyTasks, getDateKey } from '../tasks/defaults'
import type { LifeConfig, PetProfile } from './types'

export const lifeConfig = lifeConfigJson as LifeConfig

export function createDefaultProfile(now: Date = new Date()): PetProfile {
  const timestamp = now.toISOString()

  return {
    identity: {
      name: lifeConfig.defaults.name,
      createdAt: timestamp
    },
    stats: {
      mood: lifeConfig.defaults.mood,
      energy: lifeConfig.defaults.energy,
      hunger: lifeConfig.defaults.hunger,
      intimacy: lifeConfig.defaults.intimacy,
      lastUpdatedAt: timestamp
    },
    position: lifeConfig.defaults.position,
    tasks: {
      lastRefreshedOn: getDateKey(now),
      daily: createDailyTasks(),
      todos: [],
      todoHistory: []
    },
    chat: createDefaultChatState()
  }
}
