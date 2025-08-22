# 贡献指南

感谢您对项目的贡献！为了保持代码质量和一致性，请遵循以下指南。

## 代码风格

### 格式化工具

项目使用以下工具来确保代码风格一致性：

- **Prettier**: 自动格式化代码
- **ESLint**: 代码质量检查
- **EditorConfig**: 编辑器配置统一

### 缩进和空白

- 使用 **2个空格** 进行缩进
- 使用 **空格** 而不是制表符
- 移除行尾多余空白
- 文件末尾保留一个换行符

### 提交前检查

项目配置了 pre-commit 钩子，会在提交前自动：

1. 运行 Prettier 格式化代码
2. 运行 ESLint 检查并修复问题

### 手动格式化

如果需要手动格式化代码：

```bash
# 格式化所有文件
npm run format

# 检查格式化状态
npm run format:check

# 运行 ESLint 检查
npm run lint:check

# 运行 ESLint 并自动修复
npm run lint
```

## 开发环境设置

1. 安装依赖：

   ```bash
   npm install
   ```

2. 启动开发服务器：

   ```bash
   npm run dev
   ```

3. 构建项目：
   ```bash
   npm run build
   ```

## 提交规范

请使用清晰的提交信息，建议使用以下格式：

```
type(scope): description

[optional body]

[optional footer]
```

类型包括：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

## 问题报告

报告问题时请包含：

- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（操作系统、浏览器版本等）

## 功能请求

提出功能请求时请包含：

- 功能描述
- 使用场景
- 预期效果
- 可能的实现方案（可选）

感谢您的贡献！
