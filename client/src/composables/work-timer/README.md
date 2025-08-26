# Work Timer 模块拆分说明

## 概述

原来的 `useWorkTimer.js` 文件（564行）已经按照功能职责拆分为多个更小、更易维护的模块。

## 文件结构

```
work-timer/
├── index.js          # 主入口文件，整合所有模块
├── timeUtils.js      # 时间工具函数
├── storage.js        # 本地存储管理
├── heartbeat.js      # 心跳机制管理
├── timerControls.js  # 定时器控制逻辑
├── computed.js       # 计算属性逻辑
└── README.md         # 本文档
```

## 各模块职责

### 1. `index.js` - 主入口文件

- 整合所有模块
- 管理基础状态（ref）
- 处理生命周期（onMounted, onBeforeUnmount）
- 设置监听器（watch）
- 导出 `useWorkTimer` 函数

### 2. `timeUtils.js` - 时间工具函数

- `toLocalYmd()` - 日期格式化
- `formatTimeRemaining()` - 剩余时间格式化
- `formatOvertime()` - 加班时间格式化
- `formatWorkTime()` - 工作时间格式化
- `updateCurrentTime()` - 更新当前时间
- `calculateTimeRemaining()` - 计算剩余时间
- `calculateOvertime()` - 计算加班时间
- `getWeekStart()` - 获取周开始时间

### 3. `storage.js` - 本地存储管理

- `saveWorkSessions()` / `loadWorkSessions()` - 工作会话存储
- `saveSettings()` / `loadSettings()` - 设置存储
- `savePendingHeartbeats()` / `loadPendingHeartbeats()` - 待发送心跳存储
- `savePendingStarts()` / `loadPendingStarts()` - 待发送开始记录存储
- `saveTotalMs()` / `loadTotalMs()` - 总时间存储
- `clearPendingHeartbeats()` / `clearPendingStarts()` - 清理待发送数据

### 4. `heartbeat.js` - 心跳机制管理

- `HeartbeatManager` 类
- 管理心跳定时器
- 处理与服务器的同步
- 管理离线队列
- 处理网络恢复后的数据同步

### 5. `timerControls.js` - 定时器控制逻辑

- `TimerControls` 类
- `startTimer()` - 开始计时
- `stopTimer()` - 停止计时
- `resetTimer()` - 重置计时
- `setPreset()` - 设置预设时间
- `playNotificationSound()` - 播放通知音

### 6. `computed.js` - 计算属性逻辑

- `createComputedProperties()` 函数
- 创建所有计算属性：
  - `timeRemaining` - 剩余时间
  - `isOvertime` - 是否加班
  - `isWarning` - 是否警告状态
  - `displayTime` - 显示时间
  - `timeLabel` - 时间标签
  - `progressOffset` - 进度偏移
  - `todayWorkTime` - 今日工作时间
  - `weekWorkTime` - 本周工作时间

## 优势

1. **单一职责原则**：每个模块只负责一个特定的功能领域
2. **可维护性**：代码更容易理解和修改
3. **可测试性**：每个模块可以独立测试
4. **可重用性**：工具函数可以在其他地方重用
5. **代码组织**：逻辑更清晰，文件更小

## 使用方式

使用方式保持不变，仍然通过 `useWorkTimer()` 导入：

```javascript
import { useWorkTimer } from '@/composables/useWorkTimer';

const {
  currentTime,
  isTimerActive,
  startTimer,
  stopTimer,
  // ... 其他属性和方法
} = useWorkTimer();
```

## 向后兼容性

- ✅ 完全向后兼容
- ✅ 所有原有的 API 保持不变
- ✅ 功能行为完全一致
- ✅ 无需修改现有代码
