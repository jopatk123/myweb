<template>
  <div class="modal-backdrop" v-if="modelValue">
    <div class="modal">
      <div class="modal-header">
        <div class="title">{{ title }}</div>
        <button class="close" @click="$emit('update:modelValue', false)">✖</button>
      </div>
      <div class="modal-body">
        <component :is="component" v-if="component" />
        <div v-else class="empty">未找到应用组件</div>
      </div>
    </div>
  </div>
  
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  component: { type: [Object, Function], default: null },
  title: { type: String, default: '' }
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { background: #fff; width: 520px; max-width: 95vw; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #eee; }
.title { font-weight: 600; }
.close { border: none; background: none; cursor: pointer; font-size: 16px; }
.modal-body { padding: 12px; }
.empty { color: #888; text-align: center; padding: 40px 0; }
</style>


