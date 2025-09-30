import { describe, it, expect } from 'vitest';
import { useRoomCard } from '@/composables/multiplayer/useRoomCard.js';

const createProps = (overrides = {}) => ({
  room: {
    room_code: 'ABCD',
    status: 'waiting',
    mode: 'shared',
    current_players: 2,
    max_players: 4,
    players: [
      { id: 1, player_name: 'Alice', player_color: '#000', is_ready: true },
      { id: 2, player_name: 'Bob', player_color: '#111', is_ready: false },
      { id: 3, player_name: 'Cara', player_color: '#222', is_ready: false },
    ],
    ...overrides.room
  },
  maxVisiblePlayers: overrides.maxVisiblePlayers ?? 2,
  modeConfig: overrides.modeConfig || {
    shared: { icon: '🤝', label: '共享' },
  }
});

describe('useRoomCard', () => {
  it('limits visible players', () => {
    const utils = useRoomCard(createProps());
    expect(utils.visiblePlayers.value).toHaveLength(2);
    expect(utils.overflowCount.value).toBe(1);
  });

  it('computes join capability', () => {
    const utils = useRoomCard(createProps());
    expect(utils.canJoin.value).toBe(true);
  });

  it('returns disabled text when room full', () => {
    const utils = useRoomCard(createProps({ room: { current_players: 4 } }));
    expect(utils.getDisabledButtonText()).toBe('已满');
  });
});
