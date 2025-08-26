# 数据库只读错误修复记录

## 问题描述

在删除数据库后重新启动程序时，出现以下错误：

```
SqliteError: attempt to write a readonly database
```

## 错误原因

1. 数据库文件的所有者不正确（1001:1001），而当前用户是 ubuntu22 (1000:1000)
2. 这导致当前用户无法写入数据库文件

## 修复步骤

### 1. 检查数据库文件权限

```bash
ls -la server/data/
```

### 2. 修复文件所有者

```bash
sudo chown -R ubuntu22:ubuntu22 server/data/
```

### 3. 删除损坏的数据库文件

```bash
rm -f server/data/myweb.db*
```

### 4. 验证修复

- 重新启动开发环境：`./scripts/dev.sh`
- 测试API接口：`curl http://localhost:3002/api/myapps?visible=1`
- 测试前端访问：`curl http://localhost:3000`

## 预防措施

1. 确保数据库目录的所有者与运行程序的用户一致
2. 在Docker环境中运行时，注意文件权限映射
3. 定期备份数据库文件

## 修复结果

- ✅ 数据库初始化正常
- ✅ 后端API服务正常运行
- ✅ 前端服务正常访问
- ✅ 所有表结构正确创建

修复完成时间：2025-08-26 19:35
