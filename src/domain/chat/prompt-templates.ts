import type { ChatScenario } from './types'

export const promptTemplates: Record<ChatScenario, string[]> = {
  greeting: ['早呀，我来陪你啦', '今天也一起努力呀', '我已经准备好待在桌面上啦'],
  pokeReply: ['别戳啦，我在看着你呢', '嘿，我有感觉到哦', '哇，被你点到了'],
  petReply: ['这样摸摸很舒服呀', '再摸一下我会更开心', '你今天对我真好'],
  todoComplete: ['你完成啦，我也拿到奖励啦', '这个 Todo 做完得漂亮呀', '好耶，我们一起前进了一步'],
  dailyComplete: ['今天的小目标完成啦', '每日任务达成，真棒呀', '又解锁了一点点成就感'],
  idleRemark: ['我就在这里陪着你呀', '要不要顺手清一个 Todo 呀', '我偷偷看着你工作中'],
  userMessage: ['我在认真听你说呀', '我记住啦', '听起来很重要呢'],
  workStarted: ['好，我开始看着啦', '工作模式启动啦', '我来帮你盯着进度呀'],
  workThinking: ['在思考问题中...', '它好像在认真想办法呀', '我看到它在推理了'],
  workFileEdit: ['在改文件呢', '这个文件刚刚被动到了', '我看到它在写内容啦'],
  workError: ['有个小问题冒出来了', '这里似乎报错了呀', '我发现它卡了一下'],
  workComplete: ['搞定啦，要不要顺手标记 Todo？', '工作完成啦，我来汇报一下', '这一步已经收尾啦']
}
