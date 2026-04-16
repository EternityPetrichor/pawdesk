import type { PetSnapshot } from '../../../shared/types/pet'
import { useWorkModeActions } from './useWorkModeActions'

interface WorkModePanelProps {
  snapshot: PetSnapshot | null
}

export function WorkModePanel({ snapshot }: WorkModePanelProps) {
  const { sendWorkEvent, setWorkTool, toggleWorkMode } = useWorkModeActions()
  const workMode = snapshot?.workMode

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
        </div>

        <label className="panel-field">
          <span>工具</span>
          <select
            value={workMode?.tool ?? 'claude-code'}
            onChange={(event) => {
              void setWorkTool(event.target.value as 'claude-code')
            }}
          >
            <option value="claude-code">Claude Code</option>
          </select>
        </label>

        <div className="workmode-actions">
          <button
            type="button"
            onClick={() => {
              void sendWorkEvent({
                tool: 'claude-code',
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
                tool: 'claude-code',
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
                tool: 'claude-code',
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
