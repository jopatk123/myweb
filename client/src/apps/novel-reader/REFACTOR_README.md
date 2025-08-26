# 小说阅读器重构说明

## 重构目标

将原本 598 行的 `NovelReaderApp.vue` 文件进行合理拆分，提高代码的可维护性和可读性。

## 重构内容

### 1. 拆分后的文件结构

#### 核心逻辑拆分到 Composables：

- **`useNovelReader.js`** - 主要业务逻辑和状态管理
  - 响应式数据管理
  - 计算属性
  - 核心业务方法（上传、打开书籍、章节切换等）
  - 组件初始化逻辑

- **`useNovelStorage.js`** - 存储相关逻辑
  - localStorage 操作
  - 书籍数据保存/加载
  - 阅读进度保存/加载
  - 设置保存/加载

- **`useNovelParser.js`** - 文件解析逻辑
  - 章节分割算法
  - 文件解析
  - ID 生成

- **`useNovelSync.js`** - 后端同步逻辑
  - 与后端 API 同步
  - 服务器小说列表同步
  - 数据清理逻辑

#### 主组件简化：

- **`NovelReaderApp.vue`** - 简化的主组件
  - 从 598 行减少到约 120 行
  - 只保留模板和基本的组件逻辑
  - 通过 composables 获取所有功能

### 2. 重构优势

1. **单一职责原则**：每个文件都有明确的职责
2. **可复用性**：composables 可以在其他组件中复用
3. **可测试性**：逻辑分离后更容易进行单元测试
4. **可维护性**：代码结构更清晰，便于维护
5. **团队协作**：不同开发者可以专注于不同的模块

### 3. 文件大小对比

| 文件               | 重构前行数 | 重构后行数 | 减少比例 |
| ------------------ | ---------- | ---------- | -------- |
| NovelReaderApp.vue | 598        | ~120       | 80%      |
| useNovelReader.js  | -          | ~270       | -        |
| useNovelStorage.js | -          | ~85        | -        |
| useNovelParser.js  | -          | ~65        | -        |
| useNovelSync.js    | -          | ~75        | -        |

### 4. 功能保持不变

重构过程中保持了所有原有功能：

- 书籍上传和管理
- 阅读进度保存
- 章节分割和导航
- 设置管理
- 后端同步
- 搜索功能
- 书签功能

### 5. 使用方式

主组件现在通过 composables 获取所有功能：

```javascript
import { useNovelReader } from '@/composables/useNovelReader.js';

const {
  books,
  currentBook,
  // ... 其他状态和方法
} = useNovelReader();
```

### 6. 测试建议

建议对拆分后的 composables 进行单元测试：

- `useNovelParser.js` - 测试章节分割算法
- `useNovelStorage.js` - 测试存储操作
- `useNovelSync.js` - 测试同步逻辑
- `useNovelReader.js` - 测试核心业务逻辑

## 分支信息

- 分支名：`refactor/novel-reader-split`
- 创建时间：2024年
- 状态：已完成重构，构建通过
