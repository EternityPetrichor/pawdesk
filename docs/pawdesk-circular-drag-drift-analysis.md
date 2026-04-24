# Pawdesk 圆周快速拖动右漂问题分析记录

## 背景

在 `pawdesk` 中，前一轮修复已经解决了眼球朝向问题，但用户在手动验证中发现另一个剩余问题：

- 顺时针快速拖动宠物转圈时，宠物会逐渐向右移动。

这说明：
- 直线快速拖动的体验虽然改善了
- 但拖动定位逻辑在圆周高频运动下仍然存在系统性误差
- 该问题与眼球朝向问题属于不同根因链路

本次仅做分析与定位，不修改代码。

## 当前实现概览

当前 `pawdesk` 的拖动主逻辑位于：
- `src/main/ipc/pet-events.ts`
- `src/renderer/src/pet/PetCanvas.tsx`
- `src/main/main.ts`

核心机制：
1. renderer 在 pointerdown 时发送 `event.screenX/screenY`
2. main 在 `pet:pointer-down` 中再次调用 `screen.getCursorScreenPoint()`
3. main 用 `cursorPoint - petWindow.getPosition()` 计算 `grabOffset`
4. 后续拖动每 8ms 轮询一次 `screen.getCursorScreenPoint()`，再通过
   - `nextX = cursor.screenX - grabOffset.x`
   - `nextY = cursor.screenY - grabOffset.y`
   重建窗口目标位置
5. 同时，main 还有一条每 50ms 的全局 pointer 广播链路，向 renderer 推送 `pet:pointer-move`

这是一种“绝对重建窗口位置”的模型。

## 现象特征

根据用户反馈和 reviewer 的分析，该问题具有以下特征：
- 顺时针快速绕圈时更明显
- 漂移方向表现为逐渐向右
- 直线拖动相对好一些
- 眼球问题已修复，因此当前用户观察到的主要问题集中在 drag geometry 本身

这类方向性偏差通常不是纯随机抖动，更像：
- 锚点初值偏差被持续保留
- 取整 / 节流 / 系统窗口管理器异步导致的误差被反复投射到某一侧
- 或人机视觉补偿与实际几何中心不一致形成闭环放大

## 候选根因（按当前证据排序）

### 根因 A：drag start 使用了两套不同时间点的坐标源

最可疑位置：
- `src/main/ipc/pet-events.ts:133-147`
- `src/renderer/src/pet/PetCanvas.tsx:43-55`

当前 pointerdown 时：
- `startCursor` 来自 renderer 发送的 `payload.screenX/screenY`
- `grabOffset` 却来自 main 当场再次采样的 `screen.getCursorScreenPoint()`

这意味着 drag start 初始化不是同一时刻的同源采样，而是：
- 一套来自 renderer event-time
- 一套来自 IPC 到达 main 后的 poll-time

如果这两者有稳定的几毫秒时序差，在高速圆周运动中就可能把错误初始锚点固化下来。后续整段拖动都围绕这个偏移后的“假圆心”重建位置，于是出现持续右漂。

为什么这在圆周中更明显：
- 直线拖动时，用户更容易用手继续补偿，不一定明显
- 圆周拖动会反复经过各象限，任何固定初始偏差都会在轨迹闭环中被放大成单方向累计误差

### 根因 B：窗口位置使用“命令值”而不是“真实值”继续推导

最可疑位置：
- `src/main/ipc/pet-events.ts:62-86`

当前每帧：
- 代码计算 `nextPosition`
- 直接 `petWindow.setPosition(nextPosition.x, nextPosition.y)`
- 并把 `dragState.latestPosition = nextPosition`
- 广播给 renderer 的也是 `nextPosition`

但这里的 `nextPosition` 只是“希望窗口移动到那里”的命令值，而不一定是 OS/窗口管理器已经实际应用的真实位置。

潜在问题：
- Windows 或 Electron 在高频 `setPosition` 下可能有节流、取整、异步应用
- 若实际窗口少走 1px 或晚走一帧，下一帧依然按照理想位置继续算
- 误差不会被真实窗口位置纠偏，而是被继续带入后续推导

圆周高频运动比直线更容易暴露这个问题，因为：
- 轨迹曲率更高
- x/y 同时快速变化
- 取整残差更可能长期积累到某一侧

### 根因 C：drag 广播与全局 pointer 广播共用同一事件通道

相关位置：
- `src/main/main.ts:18-52`
- `src/main/ipc/pet-events.ts:35-86`

当前存在两条不同频率的广播：
- drag 期间：8ms 广播理想拖拽位置
- 全局 pointer tracking：50ms 广播窗口当前采样位置

renderer 端共用：
- `pet:pointer-move`

虽然这条问题在前一轮更明显地影响眼球跟随，但它同样暴露出系统缺少单一 truth source：
- 有时收到“理想命令位置”
- 有时收到“当前采样位置”

用户一边拖，一边根据视觉反馈调整手势时，这种状态源不一致可能放大操作回路中的偏差。

结论上它更像放大器，而不是第一根因。

### 根因 D：单窗口透明热区与视觉中心不一致，用户形成补偿性右拉

相关位置：
- `src/renderer/src/pet/PetCanvas.tsx:43-55`
- `src/main/windows/pet-window.ts`

当前是单透明窗口方案，且旧的 `hit-window` 已标记废弃：
- `src/main/windows/hit-window.ts`

这种结构容易出现：
- 可见 body 中心
- 真正命中热区
- 透明窗口几何中心
- 用户感知抓取点

四者不完全重合。

如果在顺时针拖动时用户持续以“视觉中心”为参考，而系统以另一个几何锚点工作，用户可能不断向右侧做补偿，表现成“越转越右”。

这个更像人机闭环层面的放大器，解释了“为什么顺时针更明显”，但不太像唯一技术根因。

## 与 clawd-on-desk 的关键对比

参考项目：
- `/mnt/d/Study/cc/clawd-on-desk`

关键实现：
- `src/hit-renderer.js:41-99`
- `src/preload-hit.js:4-6`
- `src/main.js:632-640`

`clawd-on-desk` 的拖动并不使用“固定抓取锚点 + 每帧绝对重建窗口位置”的模型，而是：

- pointerdown 后记录上一帧鼠标 screen 坐标
- 每次 pointermove 只计算本帧增量：
  - `dx = e.screenX - lastScreenX`
  - `dy = e.screenY - lastScreenY`
- 再通过 IPC 调主进程：`moveWindowBy(dx, dy)`
- 主进程读取当前真实窗口位置 `win.getBounds()`，执行：
  - `x = currentX + dx`
  - `y = currentY + dy`

### 为什么 clawd-on-desk 更不容易漂移

因为它不信任“历史推导出来的绝对目标位置”，而是始终基于：
- 当前真实窗口位置
- 本帧鼠标增量

这意味着：
- 即使某一帧 move 丢了、节流了、取整了
- 下一帧仍从真实窗口位置继续
- 误差不会持续围绕一个固定错误锚点积累

一句话总结：

> Clawd 的拖动是“真实位置 + 当前增量”，而 pawdesk 当前是“当前鼠标绝对位置 - 固定抓取偏移”。

在高速圆周运动下，前者天然更鲁棒。

## 当前最可信的判断

基于团队调查，当前最可信的根因排序是：

1. **A：pointerdown 双时钟源初始化导致 grabOffset 与 startCursor 不共源**
2. **B：窗口位置持续用理想命令值推进，未用真实窗口位置纠偏**
3. **C：两路 pointer 广播复用同一通道，状态源不一致形成放大效应**
4. **D：单窗口热区/视觉中心偏差导致顺时针下更明显的人机补偿偏置**

也就是说，最可能不是某一个简单的“右移 bug”，而是：
- 一个初始锚点误差
- 加上高频绝对重建的误差积累
- 再被系统窗口管理器与人机反馈放大

## 推荐的下一步定位实验

以下实验都应先做证据采集，而不是直接改代码。

### 实验 1：验证 pointerdown 双坐标源偏差

在 `pet:pointer-down` 打日志：
- `payload.screenX/screenY`
- `screen.getCursorScreenPoint()`
- `petWindow.getPosition()`
- 最终 `grabOffset`

目标：
- 统计 `payload.screenX - cursorPoint.x`
- 统计 `payload.screenY - cursorPoint.y`
- 看是否存在稳定符号偏差，尤其在圆周快速拖动起手时

### 实验 2：验证 desired position 与 actual position 残差

在 `updateDragPosition` 中记录：
- `nextPosition`
- `petWindow.getPosition()` 在 `setPosition` 后紧接着或下一 tick 的实际值
- 残差 `actual - desired`

目标：
- 验证窗口管理器是否在 x 方向存在稳定偏差或滞后
- 看 residual 是否与顺时针右漂相关

### 实验 3：标记 drag/global 两路 pointer 广播来源

为 `pet:pointer-move` payload 增加临时 source 标识：
- `drag`
- `global`

同时在 renderer 记录到达顺序和 `petX/petY` 跳变。

目标：
- 验证是否存在 global 帧覆盖 drag 帧
- 验证 renderer 是否在拖动期间收到混杂的几何状态

### 实验 4：方向性矩阵实验

固定半径与速度，分别执行：
- 顺时针 20 圈
- 逆时针 20 圈

并从四个起点开始：
- 上
- 右
- 下
- 左

目标：
- 比较最终 `Δx/Δy`
- 判断问题是否与方向、象限或起始相位有关

### 实验 5：抓取点偏置实验

在 body 不同位置按下后重复同样圆周轨迹：
- 左侧
- 中心
- 右侧

目标：
- 判断热区与视觉抓取中心偏差是否会显著改变漂移方向

### 实验 6：离线比较 absolute-anchor 与 delta-based 算法

采集同一组圆周鼠标 screen 轨迹后，离线重放两种算法：
- 当前 pawdesk 的 absolute-anchor 模型
- clawd-on-desk 风格的 delta-accumulation 模型

目标：
- 比较两者闭环轨迹终点误差
- 验证 delta-based 思路是否天然更稳

## 设计结论

当前不建议继续在现有 absolute-anchor 模型上做小修小补式猜测，而应先通过实验确认：
- 是 pointerdown 初始锚点错误更主导
- 还是 setPosition/getPosition 的 OS 残差更主导

但从参考实现对比来看，**最值得优先验证的方向** 是：

> 将 pawdesk 的拖动从“固定抓取锚点绝对重建”迁移为“基于当前真实窗口位置的增量拖动”。

这条思路最有可能从根上消除圆周高频拖动中的持续右漂。

## 结论

目前的调查已经足以说明：
- 剩余问题不是眼球逻辑残留
- 也不像单纯的 clamp/速度问题
- 更像拖动模型本身在高频曲线运动下的系统误差暴露

与 `clawd-on-desk` 相比，`pawdesk` 当前最大短板是：
- 长期依赖一个固定 `grabOffset` 去重建窗口绝对位置
- 而不是使用“真实窗口位置 + 本帧鼠标增量”的增量模型

下一步最合理的是先做日志和离线对照实验，再决定是否把拖动模型切换为 delta-based。
