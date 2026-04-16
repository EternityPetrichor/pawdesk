export type PanelThemeId = 'warm-nest' | 'night-shift' | 'level-up' | 'atelier'

export interface PanelThemeOption {
  id: PanelThemeId
  name: string
  subtitle: string
  description: string
  badge: string
}

export const defaultPanelTheme: PanelThemeId = 'warm-nest'

export const panelThemeOptions: PanelThemeOption[] = [
  {
    id: 'warm-nest',
    name: '暖窝 Warm Nest',
    subtitle: '温暖治愈',
    description: '像小爪的温柔小窝，柔和、安心，适合长期常驻桌面。',
    badge: '默认推荐'
  },
  {
    id: 'night-shift',
    name: '夜航 Night Shift',
    subtitle: '精致科技',
    description: '冷静、利落、偏未来感，适合夜间和开发工作流。',
    badge: '效率偏好'
  },
  {
    id: 'level-up',
    name: '成长局 Level Up',
    subtitle: '游戏化成长',
    description: '强调任务反馈与成长氛围，让每日使用更有达成感。',
    badge: '任务激励'
  },
  {
    id: 'atelier',
    name: '绘梦 Atelier',
    subtitle: '可爱杂志感',
    description: '像小爪的数字刊物，装饰感更强，也更有分享气质。',
    badge: '个性表达'
  }
]

export function isPanelThemeId(value: string): value is PanelThemeId {
  return panelThemeOptions.some((option) => option.id === value)
}
