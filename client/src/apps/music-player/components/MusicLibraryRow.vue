<template>
  <tr :class="{ active: isActive }">
    <td>{{ index + 1 }}</td>
    <td>
      <div v-if="isEditing" class="edit-fields">
        <input
          v-model="editDraft.title"
          type="text"
          placeholder="标题"
          data-test="title-input"
        />
        <small>文件名：{{ track.originalName || '未知文件' }}</small>
      </div>
      <div v-else class="title-cell">
        <span class="title">{{ track.title || '未命名' }}</span>
      </div>
    </td>
    <td>
      <div v-if="isEditing" class="edit-fields">
        <input
          v-model="editDraft.artist"
          type="text"
          placeholder="歌手"
          data-test="artist-input"
        />
      </div>
      <span v-else>{{ track.artist || '未知艺术家' }}</span>
    </td>
    <td>
      <div v-if="isEditing" class="edit-fields">
        <input
          v-model="editDraft.album"
          type="text"
          placeholder="专辑"
          data-test="album-input"
        />
      </div>
      <span v-else>{{ track.album || '—' }}</span>
    </td>
    <td>
      <span>{{ groupName }}</span>
    </td>
    <td>
      {{ formattedDuration }}
    </td>
    <td class="col-actions">
      <div class="action-buttons">
        <button
          class="icon-button play"
          type="button"
          @click="$emit('play-track', track.id)"
        >
          {{ isActive && isPlaying ? '⏸' : '▶️' }}
        </button>
        <button
          v-if="!isEditing"
          class="icon-button"
          type="button"
          @click="startEditing"
          data-test="edit-button"
        >
          ✏️
        </button>
        <button
          v-else
          class="icon-button confirm"
          type="button"
          @click="confirmEdit"
          data-test="confirm-edit"
        >
          ✅
        </button>
        <button
          v-if="isEditing"
          class="icon-button"
          type="button"
          @click="cancelEdit"
          data-test="cancel-edit"
        >
          ❌
        </button>
        <button
          class="icon-button"
          type="button"
          :disabled="movableGroupOptions.length === 0"
          @click="toggleMove"
          data-test="move-button"
        >
          🗂
        </button>
        <button
          class="icon-button danger"
          type="button"
          :disabled="isDeleting"
          @click="$emit('delete-track', track.id)"
          data-test="delete-button"
        >
          {{ isDeleting ? '…' : '🗑' }}
        </button>
      </div>
      <div v-if="isMoving" class="move-panel">
        <select v-model="moveTargetGroupId" data-test="move-select">
          <option
            v-for="groupOption in movableGroupOptions"
            :key="groupOption.id"
            :value="groupOption.id"
          >
            {{ groupOption.name }}
          </option>
        </select>
        <div class="move-actions">
          <button type="button" @click="confirmMove" data-test="move-confirm">
            移动
          </button>
          <button type="button" @click="cancelMove" data-test="move-cancel">
            取消
          </button>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup>
  import { computed, reactive, ref, watch } from 'vue';
  import { formatDuration } from '../utils/formatters.js';

  const props = defineProps({
    track: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
      default: 0,
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
  });

  const emit = defineEmits([
    'play-track',
    'delete-track',
    'rename-track',
    'move-track',
  ]);

  const isEditing = ref(false);
  const isMoving = ref(false);
  const editDraft = reactive({ title: '', artist: '', album: '' });
  const moveTargetGroupId = ref(null);

  const isActive = computed(
    () => Number(props.track.id) === Number(props.currentTrackId)
  );

  const isDeleting = computed(() => props.deletingIds?.has?.(props.track.id));

  const groupName = computed(() => {
    if (props.track.group?.name) return props.track.group.name;
    const gid = props.track.group?.id ?? props.track.group_id ?? null;
    return props.groups.find(group => group.id === gid)?.name || '默认歌单';
  });

  const formattedDuration = computed(() =>
    formatDuration(props.track.durationSeconds || props.track.duration)
  );

  const movableGroupOptions = computed(() => {
    const currentId = props.track.group?.id ?? props.track.group_id ?? null;
    return (props.groups || []).filter(group => group.id !== currentId);
  });

  function startEditing() {
    isEditing.value = true;
    editDraft.title = props.track.title || '';
    editDraft.artist = props.track.artist || '';
    editDraft.album = props.track.album || '';
  }

  function cancelEdit() {
    isEditing.value = false;
    editDraft.title = '';
    editDraft.artist = '';
    editDraft.album = '';
  }

  function confirmEdit() {
    emit('rename-track', {
      id: props.track.id,
      title: editDraft.title.trim(),
      artist: editDraft.artist.trim(),
      album: editDraft.album.trim(),
    });
    cancelEdit();
  }

  function toggleMove() {
    if (!movableGroupOptions.value.length) return;
    isMoving.value = !isMoving.value;
    if (isMoving.value) {
      moveTargetGroupId.value = movableGroupOptions.value[0]?.id ?? null;
    }
  }

  function cancelMove() {
    isMoving.value = false;
    moveTargetGroupId.value = null;
  }

  function confirmMove() {
    if (!moveTargetGroupId.value) return;
    emit('move-track', {
      id: props.track.id,
      groupId: Number(moveTargetGroupId.value),
    });
    cancelMove();
  }

  watch(
    () => props.track.id,
    () => {
      if (!isEditing.value) return;
      startEditing();
    }
  );
</script>

<style scoped>
  .edit-fields {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .edit-fields input {
    border-radius: 8px;
    border: none;
    padding: 6px 8px;
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

  .icon-button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button.danger {
    background: rgba(244, 67, 54, 0.5);
  }

  .icon-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
    gap: 8px;
  }

  .move-actions button {
    border: none;
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  tr:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  tr.active {
    background: rgba(255, 255, 255, 0.15);
  }
</style>
