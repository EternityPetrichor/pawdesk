import type { PetSnapshot as SharedPetSnapshot } from '../../shared/types/pet'
import type { PetSnapshot as LifePetSnapshot } from '../life/types'
import type { ChatContext } from './types'

export function buildChatContext(snapshot: SharedPetSnapshot | LifePetSnapshot): ChatContext {
  return {
    petName: snapshot.identity.name,
    mood: snapshot.stats.mood,
    energy: snapshot.stats.energy,
    hunger: snapshot.stats.hunger,
    intimacy: snapshot.stats.intimacy,
    completedDailyCount: snapshot.tasks.summary?.completedDailyCount ?? 0,
    totalDailyCount: snapshot.tasks.summary?.totalDailyCount ?? 0,
    completedTodoCount: snapshot.tasks.summary?.completedTodoCount ?? 0,
    totalTodoCount: snapshot.tasks.summary?.totalTodoCount ?? 0
  }
}
