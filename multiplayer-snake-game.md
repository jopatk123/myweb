# 多人贪吃蛇游戏功能需求文档
用户原始需求：我有个想发不知道是否可以实现，就是比如有两个人同时打开了桌面，在一个人打开贪吃蛇游戏的时候，另外一个人的桌面贪吃蛇也会自动打开，就像留言板一样，有内容的时候会自动弹出。现在的贪吃蛇只能单人玩，我想要给贪吃蛇游戏增加一些模式，共享模式：只要打开桌面了的人都可以同时控制贪吃蛇一起同步玩，竞技模式：打开两个一样的贪吃蛇游戏并排一起一个人控制一个游戏窗口，开始后同时运行；

## 🎯 AI功能分析

### 1.1 功能背景
基于现有的单机版贪吃蛇游戏，扩展多人协作和竞技功能，提升桌面应用的社交性和用户粘性。

### 1.2 核心功能
- **共享模式**: 多人同时控制一条蛇，通过投票机制决定移动方向
- **竞技模式**: 双人并排游戏，同步开始，实时对比分数
- **自动弹出**: 当有人开始游戏时，其他在线用户自动弹出游戏窗口

### 1.3 业务价值
- 增强用户社交互动体验
- 提升产品差异化竞争力
- 展示实时协作技术能力
- 提高用户留存率和活跃度

## 🎮 功能详细需求

### 2.1 共享模式 (Shared Mode)

#### 2.1.1 功能描述
多个用户同时控制一条贪吃蛇，通过投票机制决定蛇的移动方向。

#### 2.1.2 核心特性
- **实时多人控制**: 支持多人同时参与
- **投票机制**: 每个玩家可选择方向，系统选择票数最多的方向
- **玩家标识**: 每个玩家有独特的颜色和昵称标识
- **实时同步**: 游戏状态实时同步到所有参与者
- **断线重连**: 支持玩家断线后重新加入

#### 2.1.3 用户界面要求
- 显示当前参与玩家列表
- 实时显示每个玩家的投票状态
- 游戏画面上显示投票结果
- 玩家操作指示器（显示谁在控制）

#### 2.1.4 游戏规则
- 所有玩家共享同一条蛇的生命
- 投票时间限制：3秒内必须投票
- 平票处理：随机选择一个方向
- 游戏结束条件：撞到自己或边界

### 2.2 竞技模式 (Competitive Mode)

#### 2.2.1 功能描述
两个玩家同时进行独立的贪吃蛇游戏，实时对比分数和进度。

#### 2.2.2 核心特性
- **双窗口显示**: 自动创建两个并排的游戏窗口
- **同步开始**: 双方同时开始游戏
- **实时对比**: 实时显示双方分数和蛇的长度
- **胜负判定**: 游戏结束后显示胜负结果
- **观战模式**: 支持其他用户观战

#### 2.2.3 用户界面要求
- 并排显示两个游戏窗口
- 中间显示分数对比面板
- 游戏结束后显示详细统计
- 支持窗口大小调整

#### 2.2.4 游戏规则
- 双方使用相同的游戏设置
- 同时开始和结束
- 胜负判定：分数高者获胜，分数相同则蛇长者获胜
- 支持三局两胜制

### 2.3 自动弹出机制

#### 2.3.1 功能描述
当有用户开始多人游戏时，其他在线用户自动弹出游戏窗口。

#### 2.3.2 触发条件
- 用户创建新的多人游戏房间
- 用户加入现有的多人游戏
- 游戏状态发生变化（开始、结束等）

#### 2.3.3 用户控制
- 用户可设置是否启用自动弹出（默认状态使用）
- 记住用户的偏好设置

## 🏗️ 技术架构设计

### 3.1 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端客户端    │    │   WebSocket服务  │    │   数据库服务    │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 贪吃蛇游戏  │ │◄──►│ │ 消息路由    │ │◄──►│ │ 游戏房间    │ │
│ │ 组件        │ │    │ │ 服务        │ │    │ │ 数据        │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 窗口管理    │ │    │ │ 房间管理    │ │    │ │ 玩家数据    │ │
│ │ 系统        │ │    │ │ 服务        │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3.2 数据库设计

#### 3.2.1 贪吃蛇房间表 (snake_rooms)
```sql
CREATE TABLE snake_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code VARCHAR(10) UNIQUE NOT NULL,
  mode VARCHAR(20) NOT NULL, -- 'shared' | 'competitive'
  status VARCHAR(20) NOT NULL, -- 'waiting' | 'playing' | 'finished'
  max_players INTEGER DEFAULT 8,
  current_players INTEGER DEFAULT 0,
  created_by VARCHAR(36) NOT NULL,
  game_settings TEXT, -- JSON格式存储游戏设置
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2.2 贪吃蛇玩家表 (snake_players)
```sql
CREATE TABLE snake_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  player_color VARCHAR(7) DEFAULT '#007bff',
  is_ready BOOLEAN DEFAULT 0,
  is_online BOOLEAN DEFAULT 1,
  score INTEGER DEFAULT 0,
  snake_length INTEGER DEFAULT 3,
  last_vote VARCHAR(10), -- 最后投票的方向
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES snake_rooms(id)
);
```

#### 3.2.3 游戏记录表 (snake_game_records)
```sql
CREATE TABLE snake_game_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  winner_session_id VARCHAR(36),
  winner_score INTEGER,
  game_duration INTEGER, -- 游戏时长（秒）
  player_count INTEGER,
  mode VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES snake_rooms(id)
);
```

### 3.3 WebSocket消息协议
