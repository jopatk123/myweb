<template>
  <div class="voters-display">
    <h4>🗳️ 投票状态</h4>
    <div v-if="Object.keys(votes).length === 0" class="no-votes">暂无投票</div>
    <div v-else class="votes-list">
      <div
        v-for="(vote, sessionId) in votes"
        :key="sessionId"
        class="vote-item"
        :style="{ color: vote.player_color }"
      >
        <span class="voter-name">{{ vote.player_name }}</span>
        <span class="vote-direction">{{
          getDirectionText(vote.direction)
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    votes: { type: Object, default: () => ({}) },
  });

  const getDirectionText = direction => {
    const directionMap = {
      up: '⬆️ 上',
      down: '⬇️ 下',
      left: '⬅️ 左',
      right: '➡️ 右',
    };
    return directionMap[direction] || direction;
  };
</script>

<style scoped>
  .voters-display {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 20px;
  }

  .voters-display h4 {
    margin: 0 0 15px 0;
    color: #2c3e50;
    font-size: 16px;
  }

  .no-votes {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 20px;
  }

  .votes-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .vote-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #e1e8ed;
  }

  .voter-name {
    font-weight: 500;
  }

  .vote-direction {
    font-size: 14px;
  }
</style>
