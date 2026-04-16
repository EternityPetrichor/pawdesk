import tasksConfigJson from '../../../config/tasks.json'
import type { DailyTask, TasksConfig } from './types'

export const tasksConfig = tasksConfigJson as TasksConfig

export function createDailyTasks(): DailyTask[] {
  return tasksConfig.dailyTemplates.map((template) => ({
    id: template.id,
    title: template.title,
    type: template.type,
    target: template.target,
    progress: 0,
    completed: false,
    rewardApplied: false
  }))
}

export function getDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
