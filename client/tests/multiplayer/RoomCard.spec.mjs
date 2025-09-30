import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RoomCard from '@/components/multiplayer/RoomCard.vue';

describe('RoomCard', () => {
  const baseRoom = {
    room_code: 'GAME1',
    status: 'waiting',
    mode: 'shared',
    current_players: 1,
    max_players: 4,
    players: [
      { id: 1, player_name: 'Alice', player_color: '#000', is_ready: true },
    ],
  };

  it('renders join button when joinable', () => {
    const wrapper = mount(RoomCard, {
      props: { room: baseRoom },
    });

    expect(wrapper.find('button.btn-join').exists()).toBe(true);
  });

  it('emits join event on click', async () => {
    const wrapper = mount(RoomCard, {
      props: { room: baseRoom },
    });

    await wrapper.find('button.btn-join').trigger('click');
    expect(wrapper.emitted('join')).toBeTruthy();
    expect(wrapper.emitted('join')[0]).toEqual(['GAME1']);
  });

  it('falls back to disabled text when not joinable', () => {
    const wrapper = mount(RoomCard, {
      props: { room: { ...baseRoom, status: 'finished' } },
    });

    expect(wrapper.find('button.btn-disabled').text()).toContain('已结束');
  });
});
