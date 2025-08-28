#!/bin/bash

# MyWeb 开发环境启动脚本（增强版：端口占用检测 & 智能重启）

echo "🚀 Starting MyWeb Development Environment..."

# 默认端口（如需更改，请在运行前导出 FRONTEND_PORT/BACKEND_PORT）
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_PORT=${BACKEND_PORT:-3302}

# 检查并修复数据库文件权限（如果存在）
if [ -f server/data/myweb.db ]; then
    current_owner=$(stat -c '%U:%G' server/data/myweb.db 2>/dev/null || echo "unknown")
    if [ "$current_owner" != "$(whoami):$(whoami)" ]; then
        echo "🔧 Fixing database file permissions..."
        sudo chown -R "$(whoami)":"$(whoami)" server/data/ 2>/dev/null || true
        chmod -R 664 server/data/*.db* 2>/dev/null || true
    fi
fi

# PID 文件位置
FRONTEND_PIDFILE="/tmp/myweb-frontend.pid"
BACKEND_PIDFILE="/tmp/myweb-backend.pid"

# 简单工具：根据端口返回占用 PID 列表（支持 lsof 和 ss）
function pids_on_port() {
    local port="$1"
    local pids=""
    if command -v lsof >/dev/null 2>&1; then
        pids=$(lsof -ti tcp:"${port}" 2>/dev/null || true)
    fi
    if [ -z "${pids}" ] && command -v ss >/dev/null 2>&1; then
        # ss 输出类似: users:("node",pid=1234,fd=24)
        pids=$(ss -ltnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | tr '\n' ' ')
    fi
    echo "${pids}" | xargs -r echo
}

# 发送 TERM，再等待，必要时使用 KILL
function kill_pids_gracefully() {
    local pids="$@"
    if [ -z "${pids}" ]; then
        return
    fi
    echo "🛑 Killing PIDs: ${pids}"
    for pid in ${pids}; do
        if kill -0 "${pid}" 2>/dev/null; then
            kill "${pid}" 2>/dev/null || true
        fi
    done
    # 等待短暂时间
    sleep 2
    for pid in ${pids}; do
        if kill -0 "${pid}" 2>/dev/null; then
            echo "⚠️ PID ${pid} did not stop, force killing..."
            kill -9 "${pid}" 2>/dev/null || true
        fi
    done
}

# 确保端口为空；如果存在占用进程则尝试智能停止
# 参数：端口 pidfile 描述
function ensure_port_free() {
    local port="$1"
    local pidfile="$2"
    local desc="$3"

    # 如果记录了上次启动的 PID，尝试停止它
    if [ -f "${pidfile}" ]; then
        oldpid=$(cat "${pidfile}" 2>/dev/null || true)
        if [ -n "${oldpid}" ] && kill -0 "${oldpid}" 2>/dev/null; then
            echo "🔁 Found existing ${desc} PID file (${oldpid}), stopping it..."
            kill_pids_gracefully "${oldpid}"
            rm -f "${pidfile}"
        else
            rm -f "${pidfile}" 2>/dev/null || true
        fi
    fi

    # 查找仍在使用该端口的进程
    occupying_pids=$(pids_on_port "${port}")
    if [ -n "${occupying_pids}" ]; then
        echo "🔍 Port ${port} is currently used by PID(s): ${occupying_pids}"
        # 智能判断：如果占用进程明显是 node / npm / vite 之类，自动停止
        auto_kill="yes"
        if [ "${auto_kill}" = "yes" ]; then
            echo "🤖 Attempting to stop processes using port ${port}..."
            kill_pids_gracefully ${occupying_pids}
            # 再次检查
            remaining=$(pids_on_port "${port}")
            if [ -n "${remaining}" ]; then
                echo "❗ Failed to free port ${port}. Remaining PIDs: ${remaining}"
                echo "Please free the port manually or run this script with appropriate permissions. Exiting."
                exit 1
            fi
        else
            echo "Please stop the processes using port ${port} and re-run this script."
            exit 1
        fi
    fi
}

# 清理函数：停止子进程并删除 PID 文件
function cleanup() {
    echo "\n🧹 Cleaning up..."
    if [ -f "${FRONTEND_PIDFILE}" ]; then
        pid=$(cat "${FRONTEND_PIDFILE}" 2>/dev/null || true)
        kill_pids_gracefully "${pid}"
        rm -f "${FRONTEND_PIDFILE}"
    fi
    if [ -f "${BACKEND_PIDFILE}" ]; then
        pid=$(cat "${BACKEND_PIDFILE}" 2>/dev/null || true)
        kill_pids_gracefully "${pid}"
        rm -f "${BACKEND_PIDFILE}"
    fi
    # 结束所有后台 jobs（兼容旧行为）
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}

# 捕获退出信号
trap cleanup EXIT INT TERM

# 检查并创建 .env
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ Please edit .env file with your configuration"
fi

echo "📦 Installing dependencies..."

if [ -f package.json ]; then
    npm install
fi

if [ -f client/package.json ]; then
    echo "📦 Installing client dependencies..."
    (cd client && npm install)
fi

if [ -f server/package.json ]; then
    echo "📦 Installing server dependencies..."
    (cd server && npm install)
fi

echo "✅ Dependencies installed successfully!"

# 数据库迁移和检查
echo "🗄️ Checking database..."
if [ -f server/package.json ]; then
    echo "📊 Running database migrations..."
    (cd server && npm run migrate) || {
        echo "❌ Database migration failed!"
        echo "💡 Trying to fix database permissions and retry..."
        sudo chown -R "$(whoami)":"$(whoami)" server/data/ 2>/dev/null || true
        chmod -R 664 server/data/*.db* 2>/dev/null || true
        echo "🔄 Retrying database migration..."
        (cd server && npm run migrate) || {
            echo "❌ Database migration still failed after permission fix!"
            echo "🔍 Checking for migration state inconsistency..."
            
            # 检查是否存在表但迁移记录为空的情况
            if [ -f server/data/myweb.db ]; then
                echo "🔧 Attempting to fix migration state inconsistency..."
                (cd server && sqlite3 data/myweb.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='knex_migrations';" 2>/dev/null) | grep -q "1" || {
                    echo "💡 Migration table missing, creating it..."
                    (cd server && npx knex migrate:make init_migrations --knexfile ./knexfile.cjs >/dev/null 2>&1 || true)
                }
                
                # 检查是否有表存在但迁移记录为空
                table_count=$(cd server && sqlite3 data/myweb.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'knex_migrations';" 2>/dev/null || echo "0")
                migration_count=$(cd server && sqlite3 data/myweb.db "SELECT COUNT(*) FROM knex_migrations;" 2>/dev/null || echo "0")
                
                if [ "$table_count" -gt 0 ] && [ "$migration_count" -eq 0 ]; then
                    echo "💡 Tables exist but no migration records found. Marking all migrations as completed..."
                    (cd server && sqlite3 data/myweb.db "INSERT INTO knex_migrations (name, batch, migration_time) VALUES ('001_initial_schema.js', 1, datetime('now')), ('002_add_work_timer_tables.js', 1, datetime('now')), ('003_add_novel_bookmarks.js', 1, datetime('now')), ('004_add_message_board.js', 1, datetime('now')), ('005_add_message_images.js', 1, datetime('now'));" 2>/dev/null || true)
                    echo "🔄 Retrying database migration..."
                    (cd server && npm run migrate) || {
                        echo "❌ Database migration still failed after state fix!"
                        echo "💡 You may need to manually fix the database or delete and recreate it."
                        exit 1
                    }
                else
                    echo "❌ Database migration failed and could not be automatically fixed!"
                    echo "💡 You may need to manually fix database permissions or delete and recreate the database."
                    exit 1
                fi
            else
                echo "❌ Database migration failed and could not be automatically fixed!"
                echo "💡 You may need to manually fix database permissions or delete and recreate the database."
                exit 1
            fi
        }
    }
    echo "✅ Database migrations completed"
    
    echo "🔍 Checking database status..."
    (cd server && npm run db:check) || {
        echo "❌ Database check failed!"
        exit 1
    }
    echo "✅ Database check passed"
fi

echo "🔥 Starting development servers..."

# 确保本地上传目录存在且可写（当前用户）
mkdir -p server/uploads/apps/icons server/data server/logs 2>/dev/null || true
chown -R "$(whoami)":"$(whoami)" server/uploads server/data server/logs 2>/dev/null || true
chmod -R 775 server/uploads server/data server/logs 2>/dev/null || true

# 修复数据库文件权限问题
if [ -f server/data/myweb.db ]; then
    echo "🔧 Fixing database file permissions..."
    sudo chown -R "$(whoami)":"$(whoami)" server/data/ 2>/dev/null || true
    chmod -R 664 server/data/*.db* 2>/dev/null || true
fi

# 后端
echo "🔧 Preparing backend (port ${BACKEND_PORT})..."
ensure_port_free "${BACKEND_PORT}" "${BACKEND_PIDFILE}" "backend"
(cd server && npm run dev) &
backend_pid=$!
echo "${backend_pid}" > "${BACKEND_PIDFILE}"
echo "🔧 Backend started (PID ${backend_pid})"

# 给后端一点时间启动
sleep 3

# 前端
echo "🎨 Preparing frontend (port ${FRONTEND_PORT})..."
ensure_port_free "${FRONTEND_PORT}" "${FRONTEND_PIDFILE}" "frontend"
(cd client && npm run dev) &
frontend_pid=$!
echo "${frontend_pid}" > "${FRONTEND_PIDFILE}"
echo "🎨 Frontend started (PID ${frontend_pid})"

echo "\n🎉 MyWeb is running!"
echo "📱 Frontend: http://localhost:${FRONTEND_PORT}"
echo "🔧 Backend:  http://localhost:${BACKEND_PORT}"
echo "\nPress Ctrl+C to stop all servers"

# 等待任一进程结束
wait