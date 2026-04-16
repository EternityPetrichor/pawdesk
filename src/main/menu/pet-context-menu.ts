import { Menu, type BrowserWindow } from 'electron'
import { createPanelWindow } from '../windows/panel-window'
import type { PetSession } from '../pet/pet-session'

export function attachPetContextMenu(petWindow: BrowserWindow, petSession: PetSession): void {
  petWindow.webContents.on('context-menu', () => {
    const menu = Menu.buildFromTemplate([
      {
        label: '喂食',
        submenu: [
          {
            label: '喂饼干',
            click: () => {
              void petSession.feedPet('cookie')
            }
          },
          {
            label: '喂苹果',
            click: () => {
              void petSession.feedPet('apple')
            }
          }
        ]
      },
      {
        label: '聊天',
        click: () => {
          createPanelWindow('chat')
        }
      },
      {
        label: '任务与 Todo',
        click: () => {
          createPanelWindow('tasks')
        }
      },
      {
        label: '工作伙伴模式',
        submenu: [
          {
            label: '开启 / 关闭工作模式',
            click: () => {
              void petSession.toggleWorkMode(!petSession.getWorkModeState().enabled)
            }
          },
          {
            label: '打开工作状态面板',
            click: () => {
              createPanelWindow('work')
            }
          }
        ]
      },
      {
        label: '宠物资料',
        click: () => {
          createPanelWindow('profile')
        }
      },
      {
        label: '模型配置',
        click: () => {
          createPanelWindow('model')
        }
      },
      {
        label: '设置',
        click: () => {
          createPanelWindow('settings')
        }
      },
      { type: 'separator' },
      {
        label: '隐藏到边缘',
        click: () => {
          petWindow.hide()
        }
      },
      {
        label: '退出',
        click: () => {
          petWindow.close()
        }
      }
    ])

    menu.popup({ window: petWindow })
  })
}
