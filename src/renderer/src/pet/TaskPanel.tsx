import { useMemo, useState } from 'react'
import type { PetSnapshot, TodoItem, TodoScope } from '../../../shared/types/pet'
import { useTaskActions } from './useTaskActions'

interface TaskPanelProps {
  snapshot: PetSnapshot | null
}

function getCarryoverLabel(todo: TodoItem): string | null {
  if (todo.scope !== 'today' || todo.carryoverCount <= 0) {
    return null
  }

  return todo.carryoverCount === 1 ? '从昨日延续' : `已延续 ${todo.carryoverCount} 天`
}

function getHistoryDateLabel(completedAt: string): string {
  return new Date(completedAt).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  })
}

export function TaskPanel({ snapshot }: TaskPanelProps) {
  const [todoTitle, setTodoTitle] = useState('')
  const [todoScope, setTodoScope] = useState<TodoScope>('today')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const { addTodo, removeTodo, toggleTodo } = useTaskActions()
  const summary = snapshot?.tasks.summary

  const todayTodos = useMemo(
    () => snapshot?.tasks.todos.filter((todo) => !todo.completed && todo.scope === 'today') ?? [],
    [snapshot?.tasks.todos]
  )
  const longTermTodos = useMemo(
    () => snapshot?.tasks.todos.filter((todo) => !todo.completed && todo.scope === 'longTerm') ?? [],
    [snapshot?.tasks.todos]
  )
  const todoHistory = snapshot?.tasks.todoHistory ?? []
  const visibleHistory = historyExpanded ? todoHistory : todoHistory.slice(0, 5)
  const hasMoreHistory = todoHistory.length > 5

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = todoTitle.trim()
    if (!title) {
      return
    }

    await addTodo(title, todoScope)
    setTodoTitle('')
    setTodoScope('today')
  }

  return (
    <section className="task-panel">
      <div className="panel-card task-section-card">
        <div className="panel-section-header task-section-header">
          <div>
            <span className="panel-kicker">Daily mission</span>
            <h2>每日任务</h2>
          </div>
          <span className="panel-status-pill">
            {summary?.completedDailyCount ?? 0}/{summary?.totalDailyCount ?? 0}
          </span>
        </div>

        <p className="panel-muted">把陪伴互动变成今天的小目标，慢慢积累小爪的状态和亲密感。</p>

        <ul className="task-list">
          {snapshot?.tasks.daily.map((task) => (
            <li key={task.id} className={task.completed ? 'is-complete' : ''}>
              <div className="task-list-row">
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.completed ? '已完成' : '进行中'}</small>
                </div>
                <span>
                  {task.progress}/{task.target}
                </span>
              </div>
              <div className="task-progress-track">
                <div
                  className="task-progress-fill"
                  style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel-card task-section-card todo-input-card">
        <div className="panel-section-header task-section-header todo-input-header">
          <div>
            <span className="panel-kicker">Todo input</span>
            <h2>添加 Todo</h2>
            <p className="panel-muted">给今天的自己一个小目标，或者把长期计划慢慢养大。</p>
          </div>
          <span className="panel-status-pill todo-summary-pill">
            {summary?.completedTodoCount ?? 0}/{summary?.totalTodoCount ?? 0}
          </span>
        </div>

        <form className="todo-form todo-form-extended" onSubmit={handleSubmit}>
          <input
            value={todoTitle}
            onChange={(event) => setTodoTitle(event.target.value)}
            placeholder="添加一个待办..."
          />
          <div className="todo-scope-toggle" role="tablist" aria-label="Todo 类型">
            <button
              type="button"
              className={todoScope === 'today' ? 'is-selected' : ''}
              onClick={() => setTodoScope('today')}
            >
              今日
            </button>
            <button
              type="button"
              className={todoScope === 'longTerm' ? 'is-selected' : ''}
              onClick={() => setTodoScope('longTerm')}
            >
              长期
            </button>
          </div>
          <button type="submit">添加</button>
        </form>
      </div>

      <div className="panel-card task-section-card todo-primary-card">
        <div className="panel-section-header task-section-header">
          <div>
            <span className="panel-kicker">Today todos</span>
            <h2>今日事项</h2>
            <p className="panel-muted">先把今天最值得推进的几件事留在这里，小爪会一直提醒你。</p>
          </div>
          <span className="panel-status-pill">{todayTodos.length} 项</span>
        </div>

        {todayTodos.length > 0 ? (
          <ul className="todo-list todo-list-grouped">
            {todayTodos.map((todo) => {
              const carryoverLabel = getCarryoverLabel(todo)

              return (
                <li key={todo.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => {
                        void toggleTodo(todo.id)
                      }}
                    />
                    <span>
                      <strong>{todo.title}</strong>
                      {carryoverLabel ? <small className="todo-tag carryover-tag">{carryoverLabel}</small> : null}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      void removeTodo(todo.id)
                    }}
                  >
                    删除
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="panel-empty-state">今天的事项还空着，可以先给小爪安排一个小目标。</p>
        )}
      </div>

      <div className="panel-card task-section-card todo-secondary-card">
        <div className="panel-section-header task-section-header">
          <div>
            <span className="panel-kicker">Long-term todos</span>
            <h2>长期事项</h2>
            <p className="panel-muted">适合慢慢推进的计划，不会被每日节奏打断。</p>
          </div>
          <span className="panel-status-pill">{longTermTodos.length} 项</span>
        </div>

        {longTermTodos.length > 0 ? (
          <ul className="todo-list todo-list-grouped">
            {longTermTodos.map((todo) => (
              <li key={todo.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => {
                      void toggleTodo(todo.id)
                    }}
                  />
                  <span>
                    <strong>{todo.title}</strong>
                    <small className="todo-tag longterm-tag">长期事项</small>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    void removeTodo(todo.id)
                  }}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel-empty-state">长期事项适合慢慢推进的计划，比如整理方案或学习目标。</p>
        )}
      </div>

      <div className="panel-card task-section-card history-card">
        <div className="history-header">
          <div>
            <span className="panel-kicker">History</span>
            <strong>已完成历史</strong>
            <small>最近 30 天完成记录，会优先展示最近的 5 条。</small>
          </div>
          {todoHistory.length > 0 ? (
            <span className="panel-status-pill">显示 {visibleHistory.length}/{todoHistory.length} 条</span>
          ) : null}
        </div>

        {todoHistory.length > 0 ? (
          <>
            <ul className="todo-history-list">
              {visibleHistory.map((item) => (
                <li key={item.id} className="history-timeline-item">
                  <span className="history-timeline-dot" />
                  <div className="history-timeline-content">
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        {item.scope === 'today' ? '今日事项' : '长期事项'} · {getHistoryDateLabel(item.completedAt)}
                      </small>
                    </div>
                    {item.scope === 'today' && item.carryoverCount > 0 ? (
                      <span className="todo-tag carryover-tag">延续 {item.carryoverCount} 天后完成</span>
                    ) : (
                      <span className="todo-tag history-tag">已完成</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {hasMoreHistory ? (
              <div className="history-actions">
                <button
                  type="button"
                  className="history-action-button"
                  onClick={() => {
                    setHistoryExpanded((value) => !value)
                  }}
                >
                  {historyExpanded ? '仅收起' : '查看全部'}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="panel-empty-state">最近 30 天还没有完成记录，完成一个 Todo 后就会出现在这里。</p>
        )}
      </div>
    </section>
  )
}
