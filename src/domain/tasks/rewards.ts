import { tasksConfig } from './defaults'
import type { DailyTask, TaskReward } from './types'

export function getCompletedUnclaimedTasks(dailyTasks: DailyTask[]): DailyTask[] {
  return dailyTasks.filter((task) => task.completed && !task.rewardApplied)
}

export function getTaskReward(taskId: string): TaskReward | null {
  const template = tasksConfig.dailyTemplates.find((task) => task.id === taskId)
  return template?.reward ?? null
}

export function getTodoReward(): TaskReward {
  return tasksConfig.todoReward
}
