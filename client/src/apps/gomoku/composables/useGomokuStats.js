// 五子棋统计数据管理组合式函数
import { ref } from 'vue';

const STORAGE_KEYS = {
  PLAYER_WINS: 'gomoku_player_wins',
  TOTAL_GAMES: 'gomoku_total_games'
};

export function useGomokuStats() {
  // 统计数据状态
  const playerWins = ref(
    parseInt(localStorage.getItem(STORAGE_KEYS.PLAYER_WINS) || '0')
  );
  const totalGames = ref(
    parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_GAMES) || '0')
  );

  // 记录游戏结果
  function recordGameResult(winner) {
    totalGames.value++;
    
    if (winner === 1) { // 玩家获胜
      playerWins.value++;
    }
    
    // 保存到本地存储
    saveStats();
  }

  // 保存统计数据
  function saveStats() {
    localStorage.setItem(STORAGE_KEYS.PLAYER_WINS, playerWins.value.toString());
    localStorage.setItem(STORAGE_KEYS.TOTAL_GAMES, totalGames.value.toString());
  }

  // 重置统计数据
  function resetStats() {
    playerWins.value = 0;
    totalGames.value = 0;
    saveStats();
  }

  // 获取胜率
  function getWinRate() {
    if (totalGames.value === 0) return 0;
    return Math.round((playerWins.value / totalGames.value) * 100);
  }

  return {
    // 状态
    playerWins,
    totalGames,
    
    // 方法
    recordGameResult,
    resetStats,
    getWinRate
  };
}