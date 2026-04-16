import type { PetAnimationState } from '../../shared/types/pet'
import { lifeConfig } from './defaults'
import type { PetDerivedState, PetLifeStats } from './types'

function getAnimationState(stats: PetLifeStats): PetAnimationState {
  if (stats.energy <= lifeConfig.thresholds.lowEnergy) {
    return 'idle'
  }

  if (stats.mood >= lifeConfig.thresholds.happyMood) {
    return 'happy'
  }

  return 'idle'
}

function getMoodLabel(stats: PetLifeStats): string {
  if (stats.mood >= 80) {
    return '开心'
  }

  if (stats.mood >= 55) {
    return '平静'
  }

  if (stats.mood >= 30) {
    return '低落'
  }

  return '委屈'
}

function getStatusText(stats: PetLifeStats): string {
  if (stats.hunger >= lifeConfig.thresholds.highHunger) {
    return '肚子有点饿了'
  }

  if (stats.energy <= lifeConfig.thresholds.lowEnergy) {
    return '有点困，想歇一下'
  }

  if (stats.intimacy >= lifeConfig.thresholds.bondedIntimacy) {
    return '和你已经很熟啦'
  }

  if (stats.mood >= lifeConfig.thresholds.happyMood) {
    return '今天心情很好'
  }

  return '在桌面上陪着你'
}

export function derivePetState(stats: PetLifeStats): PetDerivedState {
  return {
    animationState: getAnimationState(stats),
    moodLabel: getMoodLabel(stats),
    statusText: getStatusText(stats),
    isSleeping: false
  }
}
