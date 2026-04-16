import type { TaskState, TaskSummary } from '../../shared/types/pet'

export function createTaskSummary(taskState: TaskState): TaskSummary {
  const completedDailyCount = taskState.daily.filter((task) => task.completed).length
  const completedTodoCount = taskState.todos.filter((todo) => todo.completed).length

  return {
    completedDailyCount,
    totalDailyCount: taskState.daily.length,
    completedTodoCount,
    totalTodoCount: taskState.todos.length
  }
}
