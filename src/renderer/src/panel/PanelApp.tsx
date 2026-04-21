import { useMemo, useState } from 'react'
import type { ModelConfig } from '../../../shared/types/model-config'
import type { PetSnapshot } from '../../../shared/types/pet'
import { ChatPanel } from '../pet/ChatPanel'
import { TaskPanel } from '../pet/TaskPanel'
import { WorkModePanel } from '../pet/WorkModePanel'
import { usePetSnapshot } from '../pet/usePetSnapshot'
import { panelThemeOptions, type PanelThemeId } from './panel-theme'
import { usePanelTheme } from './usePanelTheme'

type PanelKey = 'chat' | 'tasks' | 'work' | 'profile' | 'model' | 'settings'
type PanelGroup = '陪伴互动' | '能力扩展' | '管理配置'

interface PanelItem {
  key: PanelKey
  title: string
  shortTitle: string
  description: string
  group: PanelGroup
  mark: string
}

const panelItems: PanelItem[] = [
  {
    key: 'chat',
    title: '聊天',
    shortTitle: '聊天',
    description: '和小爪说说话，记录最近的陪伴片段。',
    group: '陪伴互动',
    mark: '喵'
  },
  {
    key: 'tasks',
    title: '任务与 Todo',
    shortTitle: '任务与 Todo',
    description: '把今日目标变成和小爪一起完成的小任务。',
    group: '陪伴互动',
    mark: '✓'
  },
  {
    key: 'work',
    title: '工作伙伴模式',
    shortTitle: '工作伙伴模式',
    description: '让小爪观察你的 AI 工具状态，陪你进入专注节奏。',
    group: '能力扩展',
    mark: 'AI'
  },
  {
    key: 'model',
    title: '模型配置',
    shortTitle: '模型配置',
    description: '管理后续对话能力的模型入口和 provider。',
    group: '能力扩展',
    mark: 'M'
  },
  {
    key: 'profile',
    title: '宠物资料',
    shortTitle: '宠物资料',
    description: '查看小爪当前的心情、精力、饥饿和亲密度。',
    group: '管理配置',
    mark: 'P'
  },
  {
    key: 'settings',
    title: '设置',
    shortTitle: '设置',
    description: '调整面板风格与桌宠体验偏好。',
    group: '管理配置',
    mark: 'S'
  }
]

const panelGroups: PanelGroup[] = ['陪伴互动', '能力扩展', '管理配置']

function getInitialPanel(): PanelKey {
  const search = new URLSearchParams(window.location.search)
  const panel = search.get('panel')

  if (panel === 'chat' || panel === 'tasks' || panel === 'work' || panel === 'profile' || panel === 'model' || panel === 'settings') {
    return panel
  }

  return 'tasks'
}

function ProfilePanel({ snapshot }: { snapshot: PetSnapshot | null }) {
  const stats = [
    { label: '心情', value: snapshot ? Math.round(snapshot.stats.mood) : '--', hint: snapshot?.derived.moodLabel ?? '等待同步' },
    { label: '精力', value: snapshot ? Math.round(snapshot.stats.energy) : '--', hint: '陪伴活跃度' },
    { label: '饥饿', value: snapshot ? Math.round(snapshot.stats.hunger) : '--', hint: '投喂参考' },
    { label: '亲密', value: snapshot ? Math.round(snapshot.stats.intimacy) : '--', hint: '长期关系' }
  ]

  return (
    <section className="panel-card profile-card">
      <div className="panel-section-header">
        <div>
          <span className="panel-kicker">Pet profile</span>
          <h2>宠物资料</h2>
        </div>
        <span className="panel-status-pill">{snapshot?.derived.statusText ?? '同步中'}</span>
      </div>
      <div className="profile-hero">
        <div className="profile-avatar">爪</div>
        <div>
          <strong>{snapshot?.identity.name ?? '小爪'}</strong>
          <p>今天也在桌面陪着你。</p>
        </div>
      </div>
      <div className="stat-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.hint}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

function ModelPanel({ snapshot }: { snapshot: PetSnapshot | null }) {
  const modelConfig = snapshot?.modelConfig
  const [mode, setMode] = useState<ModelConfig['mode']>(modelConfig?.mode ?? 'local-template')
  const [model, setModel] = useState(modelConfig?.model ?? 'template-v1')
  const [baseUrl, setBaseUrl] = useState(modelConfig?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await window.pawdesk.pet.saveModelConfig({
      enabled: true,
      mode,
      provider: mode,
      model: mode === 'local-template' ? 'template-v1' : model.trim() || 'claude-sonnet-4-6',
      baseUrl: mode === 'local-template' ? '' : baseUrl.trim() || 'https://api.anthropic.com',
      apiKey: apiKey.trim()
    })
    setApiKey('')
  }

  return (
    <section className="panel-card model-card">
      <div className="panel-section-header">
        <div>
          <span className="panel-kicker">Model gateway</span>
          <h2>模型配置</h2>
        </div>
        <span className="panel-status-pill">{modelConfig?.mode === 'claude' ? (modelConfig.hasApiKey ? 'Claude 已配置' : '缺少 Key') : '本地模式'}</span>
      </div>
      <p className="panel-muted">模型只负责小爪“怎么说”，生命值、任务和工作状态仍由本地规则驱动。</p>
      <form className="settings-panel" onSubmit={handleSave}>
        <label className="panel-field">
          <span>当前模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as ModelConfig['mode'])}>
            <option value="local-template">本地模板回复</option>
            <option value="claude">Claude</option>
          </select>
        </label>
        {mode === 'claude' ? (
          <>
            <label className="panel-field">
              <span>模型</span>
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="claude-sonnet-4-6" />
            </label>
            <label className="panel-field">
              <span>Base URL</span>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.anthropic.com" />
            </label>
            <label className="panel-field">
              <span>API Key</span>
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={modelConfig?.hasApiKey ? '已保存，留空会清除' : '输入 API Key'} type="password" />
            </label>
          </>
        ) : null}
        <button type="submit">保存模型配置</button>
      </form>
    </section>
  )
}

interface SettingsPanelProps {
  theme: PanelThemeId
  setTheme: (theme: PanelThemeId) => void
}

function SettingsPanel({ theme, setTheme }: SettingsPanelProps) {
  return (
    <section className="settings-panel">
      <div className="panel-card">
        <div className="panel-section-header">
          <div>
            <span className="panel-kicker">Theme studio</span>
            <h2>主题风格</h2>
          </div>
          <span className="panel-status-pill">设置页切换</span>
        </div>
        <p className="panel-muted">选择你喜欢的小爪面板氛围，整个面板页面会统一换肤。</p>
        <div className="theme-choice-grid">
          {panelThemeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`theme-choice ${theme === option.id ? 'is-selected' : ''}`}
              onClick={() => setTheme(option.id)}
            >
              <span className="theme-choice-swatch" data-swatch={option.id} />
              <span>
                <strong>{option.name}</strong>
                <small>{option.subtitle}</small>
                <em>{option.description}</em>
              </span>
              <b>{theme === option.id ? '使用中' : option.badge}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-card settings-card-secondary">
        <div className="panel-section-header">
          <div>
            <span className="panel-kicker">Preference</span>
            <h2>其他设置</h2>
          </div>
        </div>
        <p className="panel-muted">这里预留桌宠透明度、音效、提醒频率、开机启动等设置项。</p>
        <label className="panel-field">
          <span>音效</span>
          <select defaultValue="on">
            <option value="on">开启</option>
            <option value="off">关闭</option>
          </select>
        </label>
      </div>
    </section>
  )
}

export function PanelApp() {
  const snapshot = usePetSnapshot()
  const [activePanel, setActivePanel] = useState<PanelKey>(getInitialPanel)
  const { theme, setTheme } = usePanelTheme()

  const activeItem = useMemo(() => panelItems.find((item) => item.key === activePanel) ?? panelItems[0], [activePanel])
  const activeTheme = panelThemeOptions.find((option) => option.id === theme) ?? panelThemeOptions[0]

  return (
    <main className="panel-shell" data-panel-theme={theme}>
      <aside className="panel-sidebar">
        <div className="panel-brand-card">
          <span className="panel-brand-mark">Paw</span>
          <div>
            <strong>PawDesk</strong>
            <p>{snapshot?.identity.name ?? '小爪'} 的桌面小窝</p>
          </div>
        </div>

        <nav className="panel-nav" aria-label="面板导航">
          {panelGroups.map((group) => (
            <div key={group} className="panel-nav-group">
              <span className="panel-nav-group-title">{group}</span>
              {panelItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`panel-nav-item ${activePanel === item.key ? 'is-active' : ''}`}
                    onClick={() => setActivePanel(item.key)}
                  >
                    <span className="panel-nav-mark">{item.mark}</span>
                    <span>
                      <strong>{item.shortTitle}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <div className="panel-sidebar-footer">
          <span>当前风格</span>
          <strong>{activeTheme.name}</strong>
          <small>{activeTheme.subtitle}</small>
        </div>
      </aside>

      <section className="panel-content">
        <header className="panel-header">
          <span className="panel-kicker">{activeItem.group}</span>
          <div>
            <h1>{activeItem.title}</h1>
            <p>{activeItem.description}</p>
          </div>
        </header>

        <div className="panel-content-body">
          {activePanel === 'chat' ? <ChatPanel snapshot={snapshot} /> : null}
          {activePanel === 'tasks' ? <TaskPanel snapshot={snapshot} /> : null}
          {activePanel === 'work' ? <WorkModePanel snapshot={snapshot} /> : null}
          {activePanel === 'profile' ? <ProfilePanel snapshot={snapshot} /> : null}
          {activePanel === 'model' ? <ModelPanel snapshot={snapshot} /> : null}
          {activePanel === 'settings' ? <SettingsPanel theme={theme} setTheme={setTheme} /> : null}
        </div>
      </section>
    </main>
  )
}
