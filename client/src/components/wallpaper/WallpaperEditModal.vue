<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>编辑壁纸</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>名称：</label>
          <input type="text" v-model="localName" />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('close')">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper.js';

const props = defineProps({ wallpaper: { type: Object, required: true } });
const emit = defineEmits(['close', 'saved']);

const { updateWallpaper } = useWallpaper();

const localName = ref(props.wallpaper.name || props.wallpaper.original_name || '');
const saving = ref(false);
const error = ref('');

watch(() => props.wallpaper, (w) => {
  localName.value = w.name || w.original_name || '';
});

const save = async () => {
  if (!localName.value.trim()) {
    error.value = '名称不能为空';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await updateWallpaper(props.wallpaper.id, { name: localName.value.trim() });
    emit('saved');
  } catch (err) {
    error.value = err.message || '保存失败';
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content { background: white; border-radius: 8px; width: 90%; max-width: 480px; }
.modal-header { display:flex; justify-content:space-between; align-items:center; padding:16px; border-bottom:1px solid #eee }
.modal-body { padding:16px }
.form-group { margin-bottom:12px }
.error-message { background:#fee; color:#c33; padding:8px; border-radius:4px }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px }
.btn { padding:8px 14px; border:none; border-radius:4px; cursor:pointer }
.btn-primary { background:#007bff; color:white }
.btn-secondary { background:#6c757d; color:white }
.close-btn { background:none; border:none; font-size:20px; cursor:pointer }

.form-group input[type="text"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e3e7ea;
  border-radius: 6px;
  background: #fff;
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.02);
  font-size: 14px;
}

.btn { box-shadow: 0 2px 6px rgba(16,24,40,0.06); }
.btn-primary:hover:not(:disabled) { background: #0056b3 }
</style>



