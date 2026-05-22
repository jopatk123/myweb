<template>
  <div
    class="desktop-icons"
    data-group="files"
    @dragstart.prevent
    @dragover.prevent
    @drop.prevent
  >
    <div
      v-for="f in files"
      :key="f.id"
      class="icon-item"
      :class="{ selected: selectedId === f.id || selectedIds.has(f.id) }"
      :data-id="f.id"
      @click="onClick(f)"
      @dblclick="onDblClick(f)"
      @mousedown="onMouseDown(f, $event)"
      @contextmenu.prevent.stop="onContextMenu(f, $event)"
      @dragstart.prevent
      @dragover.prevent
      @drop.prevent
      draggable="false"
      :style="getIconStyle(f)"
    >
      <img :src="getIcon(f)" class="icon" draggable="false" />
      <div class="label">{{ f.originalName || f.original_name }}</div>
    </div>
    <ContextMenu
      v-model="menu.visible"
      :x="menu.x"
      :y="menu.y"
      :items="menu.items"
      @select="onMenuSelect"
    />
  </div>
  <ConfirmDialog
    v-model="confirm.visible"
    title="确认删除"
    :message="`是否删除文件：${confirm.file?.originalName || confirm.file?.original_name || ''}？`"
    @confirm="onConfirmDelete"
  />
</template>

<script setup>
  import { ref, toRef } from 'vue';
  import ContextMenu from '@/components/common/ContextMenu.vue';
  import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
  import { useFiles } from '@/composables/useFiles.js';
  import useDesktopIconInteractions from '@/composables/useDesktopIconInteractions.js';

  const props = defineProps({
    files: { type: Array, default: () => [] },
    icons: { type: Object, default: () => ({}) },
  });
  const emit = defineEmits(['open', 'delete-error', 'delete-success']);

  const { getDownloadUrl, remove } = useFiles();
  const confirm = ref({ visible: false, file: null });

  const {
    selectedId,
    selectedIds,
    onClick,
    onMouseDown,
    getIconStyle,
    autoArrange,
    setSelectedIds,
  } = useDesktopIconInteractions({
    items: toRef(props, 'files'),
    storageKey: 'desktopFileIconPositions',
    defaultStartCol: 1, // 文件图标默认从第 1 列开始，给应用图标留位
    logTag: 'FileIcons',
  });

  function getIcon(file) {
    const t = file?.typeCategory || file?.type_category || 'other';
    return props.icons?.[t] || props.icons?.other || '/apps/icons/file-128.svg';
  }

  function onDblClick(file) {
    emit('open', file);
  }

  const menu = ref({ visible: false, x: 0, y: 0, file: null, items: [] });
  function onContextMenu(file, e) {
    onClick(file);
    menu.value.file = file;
    menu.value.x = e.clientX;
    menu.value.y = e.clientY;
    const baseItems = [
      { key: 'download', label: '下载' },
      { key: 'delete', label: '删除', danger: true },
    ];
    const fc = file.typeCategory || file.type_category || '';
    if (fc === 'image' || fc === 'video' || fc === 'word' || fc === 'excel') {
      baseItems.unshift({ key: 'preview', label: '预览' });
    }
    menu.value.items = baseItems;
    menu.value.visible = true;
  }
  async function onMenuSelect(key) {
    const file = menu.value.file;
    if (!file) return;
    if (key === 'download') {
      const url = getDownloadUrl(file.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName || file.original_name || '';
      a.target = '_blank';
      a.click();
      return;
    }
    if (key === 'delete') {
      confirm.value = { visible: true, file };
      return;
    }
    if (key === 'preview') {
      // 向父组件冒泡一个预览请求
      emit('open', { ...file, __preview: true });
      return;
    }
  }

  async function onConfirmDelete() {
    const f = confirm.value.file;
    confirm.value.visible = false;
    if (!f) return;
    try {
      await remove(f.id);
      emit('delete-success', { file: f });
    } catch (error) {
      console.error('FileIcons.delete error', error);
      emit('delete-error', { file: f, error });
    }
  }

  defineExpose({ autoArrange, setSelectedIds });
</script>

<style scoped>
  .desktop-icons {
    position: absolute;
    top: 20px;
    left: 120px;
    display: grid;
    grid-template-columns: repeat(auto-fill, 72px);
    gap: 16px;
    z-index: 5;
  }
  .icon-item {
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: default;
    user-select: none;
  }
  .icon-item.selected .label {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 2px 4px;
  }
  .icon {
    width: 48px;
    height: 48px;
    object-fit: contain;
    -webkit-user-drag: none;
  }
  .label {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    font-size: 12px;
    text-align: center;
  }
</style>
