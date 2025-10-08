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
            <tr
              v-for="(track, index) in group.tracks"
              :key="track.id"
              :class="{ active: track.id === currentTrackId }"
            >
              <td>{{ index + 1 }}</td>
              <td>
                <div v-if="editingRow === track.id" class="edit-fields">
                  <input
                    v-model="editDraft.title"
                    type="text"
                    placeholder="标题"
                  />
                  <small>文件名：{{ track.originalName || '未知文件' }}</small>
                </div>
                <div v-else class="title-cell">
                  <span class="title">{{ track.title || '未命名' }}</span>
                </div>
              </td>
              <td>
                <div v-if="editingRow === track.id" class="edit-fields">
                  <input
                    v-model="editDraft.artist"
                    type="text"
                    placeholder="歌手"
                  />
                </div>
                <span v-else>{{ track.artist || '未知艺术家' }}</span>
              </td>
              <td>
                <div v-if="editingRow === track.id" class="edit-fields">
                  <input
                    v-model="editDraft.album"
                    type="text"
                    placeholder="专辑"
                  />
                </div>
                <span v-else>{{ track.album || '—' }}</span>
              </td>
              <td>
                <span>{{ getGroupName(track) }}</span>
              </td>
              <td>
                {{ formatDuration(track.durationSeconds || track.duration) }}
              </td>
              <td class="col-actions">
                <div class="action-buttons">
                  <button
                    class="icon-button play"
                    type="button"
                    @click="$emit('play-track', track.id)"
                  >
                    {{ track.id === currentTrackId && isPlaying ? '⏸' : '▶️' }}
                  </button>
                  <button
                    v-if="editingRow !== track.id"
                    class="icon-button"
                    type="button"
                    @click="startEditing(track)"
                  >
                    ✏️
                  </button>
                  <button
                    v-else
                    class="icon-button confirm"
                    type="button"
                    @click="confirmEdit(track.id)"
                  >
                    ✅
                  </button>
                  <button
                    v-if="editingRow === track.id"
                    class="icon-button"
                    type="button"
                    @click="cancelEdit"
                  >
                    ❌
                  </button>
                  <button
                    class="icon-button"
                    type="button"
                    :disabled="movableGroups(track).length === 0"
                    @click="startMove(track)"
                  >
                    🗂
                  </button>
                  <button
                    class="icon-button danger"
                    type="button"
                    :disabled="deletingIds.has(track.id)"
                    @click="$emit('delete-track', track.id)"
                  >
                    {{ deletingIds.has(track.id) ? '…' : '🗑' }}
                  </button>
                </div>
                <div v-if="movingTrackId === track.id" class="move-panel">
                  <select v-model="moveTargetGroupId">
                    <option
                      v-for="groupOption in movableGroups(track)"
                      :key="groupOption.id"
                      :value="groupOption.id"
                    >
                      {{ groupOption.name }}
                    </option>
                  </select>
                  <div class="move-actions">
                    <button type="button" @click="confirmMove(track.id)">
                      移动
                    </button>
                    <button type="button" @click="cancelMove">取消</button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-group">暂无歌曲</div>
      </section>
    </div>
  </section>
</template>

<script setup>
  import { ref, computed, toRefs } from 'vue';

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

  const emit = defineEmits([
    'play-track',
    'delete-track',
    'rename-track',
    'move-track',
  ]);

  const editingRow = ref(null);
  const editDraft = ref({ title: '', artist: '', album: '' });
  const movingTrackId = ref(null);
  const moveTargetGroupId = ref(null);

  function startEditing(track) {
    editingRow.value = track.id;
    editDraft.value = {
      title: track.title || '',
      artist: track.artist || '',
      album: track.album || '',
    };
  }

  function cancelEdit() {
    editingRow.value = null;
    editDraft.value = { title: '', artist: '', album: '' };
  }

  function getGroupName(track) {
    return (
      track.group?.name ||
      groups.value?.find(g => g.id === (track.group?.id ?? track.group_id))
        ?.name ||
      '默认歌单'
    );
  }

  function movableGroups(track) {
    const currentId = track.group?.id ?? track.group_id ?? null;
    return (groups.value || []).filter(group => group.id !== currentId);
  }

  function startMove(track) {
    const options = movableGroups(track);
    if (!options.length) return;
    movingTrackId.value = track.id;
    moveTargetGroupId.value = options[0]?.id ?? null;
  }

  function cancelMove() {
    movingTrackId.value = null;
    moveTargetGroupId.value = null;
  }

  function confirmMove(id) {
    if (!moveTargetGroupId.value) return;
    emit('move-track', { id, groupId: moveTargetGroupId.value });
    cancelMove();
  }

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

  function confirmEdit(id) {
    emit('rename-track', {
      id,
      title: editDraft.value.title.trim(),
      artist: editDraft.value.artist.trim(),
      album: editDraft.value.album.trim(),
    });
    cancelEdit();
  }

  function formatDuration(seconds) {
    const total = Number(seconds) || 0;
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
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

  tr:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  tr.active {
    background: rgba(255, 255, 255, 0.15);
  }

  .title-cell .title {
    font-weight: 500;
  }

  .col-actions {
    width: 160px;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .move-panel {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .move-panel select {
    flex: 1;
    border-radius: 8px;
    padding: 6px 8px;
    border: none;
  }

  .move-actions {
    display: flex;
    gap: 6px;
  }

  .move-actions button {
    border: none;
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .move-actions button:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .empty-group {
    padding: 16px;
    text-align: center;
    opacity: 0.65;
  }

  .icon-button {
    border: none;
    background: rgba(255, 255, 255, 0.12);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .icon-button:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .icon-button.danger {
    background: rgba(255, 138, 128, 0.3);
  }

  .icon-button.danger:hover {
    background: rgba(255, 138, 128, 0.45);
  }

  .icon-button:disabled {
    cursor: progress;
    background: rgba(255, 255, 255, 0.1);
  }

  .edit-fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .edit-fields input {
    border: none;
    border-radius: 8px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
  }

  .edit-fields small {
    font-size: 11px;
    opacity: 0.7;
  }
</style>
