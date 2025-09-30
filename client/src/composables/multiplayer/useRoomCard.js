import { computed } from 'vue';

export function useRoomCard(props) {
  const visiblePlayers = computed(() =>
    (props.room.players || []).slice(0, props.maxVisiblePlayers)
  );

  const overflowCount = computed(() => {
    const playerCount = props.room.players?.length || 0;
    return Math.max(0, playerCount - props.maxVisiblePlayers);
  });

  const canJoin = computed(() => {
    return (
      props.room.status === 'waiting' &&
      props.room.current_players < props.room.max_players
    );
  });

  const canSpectate = computed(() => props.room.status === 'playing');

  const modeClass = computed(() => `mode-${props.room.mode}`);

  const statusClass = computed(() => `status-${props.room.status}`);

  const statusText = computed(() => {
    const statusMap = {
      waiting: '等待中',
      playing: '游戏中',
      finished: '已结束',
      paused: '已暂停',
    };
    return statusMap[props.room.status] || props.room.status;
  });

  const getModeIcon = mode => props.modeConfig[mode]?.icon || '🎮';

  const getModeLabel = mode => props.modeConfig[mode]?.label || mode;

  const getDisabledButtonText = () => {
    if (props.room.current_players >= props.room.max_players) {
      return '已满';
    }
    return props.room.status === 'finished' ? '已结束' : '游戏中';
  };

  const getPlayerInitial = name => (name ? name.charAt(0).toUpperCase() : '?');

  const getPlayerTitle = player => {
    if (!player?.player_name) return '';
    return `${player.player_name}${player.is_ready ? ' (已准备)' : ''}`;
  };

  return {
    visiblePlayers,
    overflowCount,
    canJoin,
    canSpectate,
    modeClass,
    statusClass,
    statusText,
    getModeIcon,
    getModeLabel,
    getDisabledButtonText,
    getPlayerInitial,
    getPlayerTitle,
  };
}
