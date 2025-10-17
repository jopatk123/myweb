<template>
  <section class="music-library">
    <div v-if="loading" class="loading-state">正在加载音乐库...</div>
    <div v-else-if="!tracks.length" class="empty-state">
      <p>还没有音乐文件，点击右上角的“上传音乐”开始吧。</p>
    </div>
    <div v-else class="table-wrapper">
      <section
        v-for="group in displayBuckets"
        :key="group.group?.id ?? 'all'"
        class="group-block"
      >
        <header class="group-header" v-if="group.group">
          <h3>{{ group.group.name }}</h3>
          <span class="count">共 {{ group.tracks.length }} 首</span>
        </header>
        <table v-if="group.tracks.length">
          <thead>
            <tr>
              <th>#</th>
              <th>标题</th>
              <th>歌手</th>
              <th>专辑</th>
              <th>所属歌单</th>
              <th>时长</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <MusicLibraryRow
              v-for="(track, index) in group.tracks"
              :key="track.id"
              :track="track"
              :index="index"
              :current-track-id="currentTrackId"
              :is-playing="isPlaying"
              :groups="groups"
              :deleting-ids="deletingIds"
              @play-track="$emit('play-track', $event)"
              @delete-track="$emit('delete-track', $event)"
              @rename-track="$emit('rename-track', $event)"
              @move-track="$emit('move-track', $event)"
            />
          </tbody>
        </table>
        <div v-else class="empty-group">暂无歌曲</div>
      </section>
    </div>
  </section>
</template>

<script setup>
  import { computed, toRefs } from 'vue';
  import MusicLibraryRow from './components/MusicLibraryRow.vue';

  const props = defineProps({
    tracks: {
      type: Array,
      default: () => [],
    },
    groupedTracks: {
      type: Array,
      default: () => [],
    },
    groups: {
      type: Array,
      default: () => [],
    },
    currentTrackId: {
      type: [Number, String, null],
      default: null,
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
    deletingIds: {
      type: Object,
      default: () => new Set(),
    },
    loading: {
      type: Boolean,
      default: false,
    },
    activeGroupId: {
      type: [Number, String, null],
      default: null,
    },
  });

  const {
    tracks,
    groupedTracks,
    groups,
    currentTrackId,
    isPlaying,
    deletingIds,
    loading,
    activeGroupId,
  } = toRefs(props);

  defineEmits(['play-track', 'delete-track', 'rename-track', 'move-track']);

  const displayBuckets = computed(() => {
    if (activeGroupId.value === 'all') {
      return groupedTracks.value.length
        ? groupedTracks.value
        : [
            {
              group: null,
              tracks: tracks.value,
            },
          ];
    }
    return [
      {
        group:
          (groups.value || []).find(
            group => group.id === Number(activeGroupId.value)
          ) || null,
        tracks: tracks.value,
      },
    ];
  });
</script>

<style scoped>
  .music-library {
    flex: 1;
    min-height: 0;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 16px;
    padding: 12px;
    overflow: auto;
  }

  .loading-state,
  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    color: rgba(255, 255, 255, 0.8);
    height: 100%;
    font-size: 16px;
  }

  .table-wrapper {
    overflow: auto;
    max-height: 100%;
  }

  .group-block {
    margin-bottom: 24px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 12px;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .group-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .group-header .count {
    font-size: 12px;
    opacity: 0.7;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
  }

  th,
  td {
    text-align: left;
    padding: 10px 12px;
    font-size: 14px;
  }

  th {
    font-weight: 600;
    opacity: 0.75;
  }

  .col-actions {
    width: 160px;
  }

  .empty-group {
    padding: 16px;
    text-align: center;
    opacity: 0.65;
  }
</style>
