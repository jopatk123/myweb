<template>
  <div class="game-settings">
    <h3>🎮 游戏设置</h3>
    <div class="settings-list">
      <div class="setting-item">
        <span class="setting-label">游戏模式</span>
        <span class="setting-value">
          {{ room?.mode === 'shared' ? '🤝 共享模式' : '⚔️ 竞技模式' }}
        </span>
      </div>
      
      <div class="setting-item">
        <span class="setting-label">最大玩家数</span>
        <span class="setting-value">{{ room?.max_players }} 人</span>
      </div>
      
      <div class="setting-item">
        <span class="setting-label">游戏地图</span>
        <span class="setting-value">20x20</span>
      </div>
      
      <div class="setting-item">
        <span class="setting-label">初始速度</span>
        <span class="setting-value">中等</span>
      </div>
    </div>

    <!-- 游戏规则说明 -->
    <div class="game-rules">
      <h4>📖 游戏规则</h4>
      <ul v-if="room?.mode === 'shared'">
        <li>所有玩家共同控制一条蛇</li>
        <li>通过投票决定蛇的移动方向</li>
        <li>投票时间限制为3秒</li>
        <li>获得最多票数的方向会被执行</li>
      </ul>
      <ul v-else>
        <li>每个玩家独立控制自己的蛇</li>
        <li>使用WASD或方向键控制移动</li>
        <li>撞到墙壁或其他蛇身会死亡</li>
        <li>最后存活的玩家获胜</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineProps({
  room: { type: Object, default: null },
  gameState: { type: Object, default: null }
})
</script>

<style scoped>
.game-settings {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}

.game-settings h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 18px;
}

.settings-list {
  margin-bottom: 25px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e1e8ed;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  color: #666;
  font-size: 14px;
}

.setting-value {
  color: #2c3e50;
  font-weight: 500;
  font-size: 14px;
}

.game-rules {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.game-rules h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 14px;
}

.game-rules ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.game-rules li {
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.game-rules li:last-child {
  margin-bottom: 0;
}
</style>
