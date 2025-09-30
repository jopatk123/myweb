#!/bin/bash

set -euo pipefail

# 默认端口，可通过环境变量覆盖
: ${FRONTEND_PORT:=5173}
: ${BACKEND_PORT:=3000}

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# 查找占用指定端口的 PID 列表
find_pids_on_port() {
	local port="$1"
	local pids
	# 优先使用 lsof，如果没有则尝试 ss
	if command -v lsof >/dev/null 2>&1; then
		pids=$(lsof -iTCP:"${port}" -sTCP:LISTEN -t || true)
	elif command -v ss >/dev/null 2>&1; then
		pids=$(ss -ltnp "sport = :${port}" 2>/dev/null | awk -F"pid=" '/pid=/ {print $2}' | awk -F"," '{print $1}' | sort -u || true)
	else
		# 不能检测端口的工具，返回空
		pids=""
	fi
	echo "$pids"
}

# 优雅停止 PID（先 SIGTERM，等待，然后 SIGKILL）
stop_pids() {
	local pids=($1)
	local timeout=5
	if [ "${#pids[@]}" -eq 0 ]; then
		return 0
	fi
	log "Stopping processes: ${pids[*]}"
	kill ${pids[*]} 2>/dev/null || true
	# 等待进程退出
	local waited=0
	while [ $waited -lt $timeout ]; do
		sleep 1
		waited=$((waited+1))
		local alive=()
		for pid in "${pids[@]}"; do
			if kill -0 "$pid" 2>/dev/null; then
				alive+=($pid)
			fi
		done
		if [ ${#alive[@]} -eq 0 ]; then
			log "Processes terminated gracefully"
			return 0
		fi
	done
	# 强制杀死仍然存活的进程
	local to_kill=()
	for pid in "${pids[@]}"; do
		if kill -0 "$pid" 2>/dev/null; then
			to_kill+=($pid)
		fi
	done
	if [ ${#to_kill[@]} -gt 0 ]; then
		log "Forcing kill on: ${to_kill[*]}"
		kill -9 ${to_kill[*]} 2>/dev/null || true
	fi
}

# 清理指定端口上的进程
cleanup_port() {
	local port="$1"
	local pids
	pids=$(find_pids_on_port "$port")
	if [ -z "${pids}" ]; then
		log "Port ${port} is free"
		return 0
	fi
	# 转换为数组
	read -r -a pid_arr <<<"${pids}"
	log "Port ${port} is occupied by PID(s): ${pid_arr[*]}. Attempting to stop."
	stop_pids "${pid_arr[*]}"
}

#########
# 开始启动流程
#########

log "Checking ports before start: frontend=${FRONTEND_PORT}, backend=${BACKEND_PORT}"
cleanup_port "${FRONTEND_PORT}"
cleanup_port "${BACKEND_PORT}"

# 启动前端开发服务器
log "Starting frontend (client)"
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

# 启动后端开发服务器
log "Starting backend (server)"
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# 等待两个进程
wait $FRONTEND_PID
wait $BACKEND_PID

