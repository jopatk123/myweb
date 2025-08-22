<template>
  <div v-if="modelValue" class="backdrop">
    <div class="dialog">
      <div class="title">确认下载</div>
      <div class="content">是否下载文件「{{ filename }}」？</div>
      <div class="actions">
        <button @click="$emit('update:modelValue', false)">取消</button>
        <a :href="downloadUrl" @click="$emit('update:modelValue', false)" class="primary">下载</a>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  filename: { type: String, default: '' },
  downloadUrl: { type: String, default: '' }
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index: 100; }
.dialog { width: 360px; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.title { font-weight: 600; padding: 12px 16px; border-bottom: 1px solid #eee; }
.content { padding: 16px; color: #333; }
.actions { display:flex; justify-content:flex-end; gap: 10px; padding: 10px 16px; border-top: 1px solid #eee; }
button, .primary { padding: 6px 12px; border: 1px solid #ddd; background: #f9f9f9; border-radius: 6px; cursor: pointer; text-decoration: none; color: #333; }
.primary { background: #16a34a; color: #fff; border-color: #16a34a; }
</style>


