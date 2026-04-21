import type { PetSnapshot, WorkTool } from '../../../shared/types/pet'
import { useWorkModeActions } from './useWorkModeActions'

interface WorkModePanelProps {
  snapshot: PetSnapshot | null
}

const toolOptions: Array<{ value: WorkTool; label: string }> = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'codex', label: 'Codex' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'gemini', label: 'Gemini' }
]

export function WorkModePanel({ snapshot }: WorkModePanelProps) {
  const { sendWorkEvent, setWorkTool, toggleWorkMode } = useWorkModeActions()
  const workMode = snapshot?.workMode
  const selectedTool = workMode?.tool ?? 'claude-code'

  return (
    <section className="workmode-panel">
      <div className="panel-card workmode-card">
        <div className="panel-section-header workmode-header">
          <div>
            <span className="panel-kicker">Work companion</span>
            <h2>工作伙伴</h2>
          </div>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={workMode?.enabled ?? false}
              onChange={(event) => {
                void toggleWorkMode(event.target.checked)
              }}
            />
            <span>{workMode?.enabled ? '已开启' : '已关闭'}</span>
          </label>
        </div>

        <div className="workmode-status-card">
          <strong>{workMode?.status ?? 'disabled'}</strong>
          <p>{workMode?.lastEvent?.message ?? '还没有工作事件'}</p>
          {workMode?.lastEvent?.filePath ? <code>{workMode.lastEvent.filePath}</code> : null}
          <small>连接状态：{workMode?.connection ?? 'idle'}</small>
        </div>

        <label className="panel-field">
          <span>工具</span>
          <select
            value={selectedTool}
            onChange={(event) => {
              void setWorkTool(event.target.value as WorkTool)
            }}
          >
            {toolOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="stat-grid">
          <article className="stat-card">
            <span>错误次数</span>
            <strong>{workMode?.summary.errorCount ?? 0}</strong>
            <small>当前会话累计</small>
          </article>
          <article className="stat-card">
            <span>最近完成</span>
            <strong>{workMode?.summary.lastCompletedAt ? '有' : '无'}</strong>
            <small>{workMode?.summary.lastCompletedAt ?? '尚未完成事件'}</small>
          </article>
        </div>

        {workMode?.summary.recentFiles.length ? (
          <div className="panel-field">
            <span>最近文件</span>
            <ul className="chat-history">
              {workMode.summary.recentFiles.map((filePath) => (
                <li key={filePath} className="chat-message chat-pet">
                  <p>{filePath}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="workmode-actions">
          <button
            type="button"
            onClick={() => {
              void sendWorkEvent({
                tool: selectedTool,
                type: 'tool.thinking',
                message: '在思考问题...',
                timestamp: new Date().toISOString()
              })
            }}
          >
            模拟思考
          </button>
          <button
            type="button"
            onClick={() => {
              void sendWorkEvent({
                tool: selectedTool,
                type: 'tool.file_edit',
                message: '正在修改 pet-session.ts',
                filePath: 'src/main/pet/pet-session.ts',
                timestamp: new Date().toISOString()
              })
            }}
          >
            模拟改文件
          </button>
          <button
            type="button"
            onClick={() => {
              void sendWorkEvent({
                tool: selectedTool,
                type: 'tool.error',
                message: '遇到了一个错误',
                timestamp: new Date().toISOString()
              })
            }}
          >
            模拟报错
          </button>
          <button
            type="button"
            onClick={() => {
              void sendWorkEvent({
                tool: selectedTool,
                type: 'tool.complete',
                message: '任务完成',
                timestamp: new Date().toISOString()
              })
            }}
          >
            模拟完成
          </button>
        </div>
      </div>
    </section>
  )
}
