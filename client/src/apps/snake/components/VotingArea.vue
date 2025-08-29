<template>
  <div class="voting-area">
    <h4>🗳️ 投票控制蛇的方向</h4>
    
    <div class="vote-buttons">
      <div class="vote-row">
        <button 
          class="vote-btn vote-up"
          :class="{ 'voted': myVote === 'up', 'winning': isWinningDirection('up') }"
          @click="$emit('vote', 'up')"
          :disabled="voteTimeout <= 0"
        >
          ⬆️ 上
          <span class="vote-count">{{ getVoteCount('up') }}</span>
        </button>
      </div>
      
      <div class="vote-row">
        <button 
          class="vote-btn vote-left"
          :class="{ 'voted': myVote === 'left', 'winning': isWinningDirection('left') }"
          @click="$emit('vote', 'left')"
          :disabled="voteTimeout <= 0"
        >
          ⬅️ 左
          <span class="vote-count">{{ getVoteCount('left') }}</span>
        </button>
        
        <button 
          class="vote-btn vote-right"
          :class="{ 'voted': myVote === 'right', 'winning': isWinningDirection('right') }"
          @click="$emit('vote', 'right')"
          :disabled="voteTimeout <= 0"
        >
          ➡️ 右
          <span class="vote-count">{{ getVoteCount('right') }}</span>
        </button>
      </div>
      
      <div class="vote-row">
        <button 
          class="vote-btn vote-down"
          :class="{ 'voted': myVote === 'down', 'winning': isWinningDirection('down') }"
          @click="$emit('vote', 'down')"
          :disabled="voteTimeout <= 0"
        >
          ⬇️ 下
          <span class="vote-count">{{ getVoteCount('down') }}</span>
        </button>
      </div>
    </div>

    <!-- 投票玩家显示 -->
    <div class="voters-display">
      <div 
        v-for="(vote, sessionId) in votes" 
        :key="sessionId"
        class="voter-info"
        :style="{ color: vote.player_color }"
      >
        {{ vote.player_name }} 投票: {{ getDirectionText(vote.direction) }}
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  votes: { type: Object, default: () => ({}) },
  myVote: { type: String, default: null },
  voteTimeout: { type: Number, default: 0 },
  players: { type: Array, default: () => [] }
})

defineEmits(['vote'])

// 获取投票数量
const getVoteCount = (direction) => {
  return Object.values(props.votes).filter(vote => vote.direction === direction).length
}

// 检查是否是获胜方向
const isWinningDirection = (direction) => {
  const counts = {
    up: getVoteCount('up'),
    down: getVoteCount('down'),
    left: getVoteCount('left'),
    right: getVoteCount('right')
  }
  
  const maxCount = Math.max(...Object.values(counts))
  return maxCount > 0 && counts[direction] === maxCount
}

// 获取方向文本
const getDirectionText = (direction) => {
  const directionMap = {
    up: '上',
    down: '下',
    left: '左',
    right: '右'
  }
  return directionMap[direction] || direction
}
</script>

<style scoped>
.voting-area {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.voting-area h4 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  text-align: center;
}

.vote-buttons {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 10px;
  max-width: 200px;
  margin: 0 auto 20px;
}

.vote-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.vote-up, .vote-down {
  justify-self: center;
  width: 80px;
}

.vote-btn {
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  font-weight: 500;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.vote-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #f8f9ff;
}

.vote-btn.voted {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.vote-btn.winning {
  border-color: #2ed573;
  background: #f0fff4;
}

.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vote-count {
  font-size: 12px;
  font-weight: bold;
  opacity: 0.8;
}

.voters-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 100px;
  overflow-y: auto;
}

.voter-info {
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

@media (max-width: 480px) {
  .vote-buttons {
    max-width: 150px;
  }
  
  .vote-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
