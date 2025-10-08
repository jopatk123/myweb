import { mount } from '@vue/test-utils';
import MusicLibraryRow from '@/apps/music-player/components/MusicLibraryRow.vue';

describe('MusicLibraryRow', () => {
  const baseProps = {
    track: {
      id: 1,
      title: 'Track One',
      artist: 'Artist A',
      album: 'Album A',
      durationSeconds: 120,
      group: { id: 1, name: '默认歌单' },
    },
    index: 0,
    groups: [
      { id: 1, name: '默认歌单', isDefault: true },
      { id: 2, name: '收藏歌单', isDefault: false },
    ],
    currentTrackId: 2,
    isPlaying: false,
    deletingIds: new Set(),
  };

  it('emits rename-track with trimmed fields when confirm edit', async () => {
    const wrapper = mount(MusicLibraryRow, {
      props: { ...baseProps },
    });

    await wrapper.find('[data-test="edit-button"]').trigger('click');
    await wrapper.find('[data-test="title-input"]').setValue('  New Title  ');
    await wrapper.find('[data-test="artist-input"]').setValue('  New Artist  ');
    await wrapper.find('[data-test="album-input"]').setValue('  New Album  ');
    await wrapper.find('[data-test="confirm-edit"]').trigger('click');

    const events = wrapper.emitted('rename-track');
    expect(events).toHaveLength(1);
    expect(events?.[0]?.[0]).toEqual({
      id: 1,
      title: 'New Title',
      artist: 'New Artist',
      album: 'New Album',
    });
  });

  it('emits move-track with selected group', async () => {
    const wrapper = mount(MusicLibraryRow, {
      props: { ...baseProps },
    });

    await wrapper.find('[data-test="move-button"]').trigger('click');
    const select = wrapper.find('[data-test="move-select"]');
    await select.setValue('2');
    await wrapper.find('[data-test="move-confirm"]').trigger('click');

    const events = wrapper.emitted('move-track');
    expect(events).toHaveLength(1);
    expect(events?.[0]?.[0]).toEqual({ id: 1, groupId: 2 });
  });

  it('emits delete-track when delete button clicked', async () => {
    const wrapper = mount(MusicLibraryRow, {
      props: { ...baseProps },
    });

    await wrapper.find('[data-test="delete-button"]').trigger('click');

    const events = wrapper.emitted('delete-track');
    expect(events).toHaveLength(1);
    expect(events?.[0]?.[0]).toBe(1);
  });
});
