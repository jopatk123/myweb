<template>
  <div v-if="show" class="modal-backdrop" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <div class="title">移动应用到分组</div>
        <button class="close" @click="close">✖</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label>目标分组</label>
          <select v-model="targetGroupId">
            <option :value="null">请选择分组</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="submit">移动</button>
          <button class="btn" @click="close">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';

  const props = defineProps({
    show: Boolean,
    groups: {
      type: Array,
      required: true,
    },
  });

  const emit = defineEmits(['update:show', 'submit']);

  const targetGroupId = ref(null);

  watch(
    () => props.show,
    newVal => {
      if (newVal) {
        targetGroupId.value = null; // Reset on open
      }
    }
  );

  const close = () => {
    emit('update:show', false);
  };

  const submit = () => {
    if (!targetGroupId.value) {
      alert('请选择目标分组');
      return;
    }
    emit('submit', targetGroupId.value);
  };
</script>

<style scoped>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: #fff;
    width: 520px;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
  }
  .modal-body {
    padding: 12px;
  }
  .title {
    font-weight: 600;
  }
  .close {
    background: none;
    border: none;
    cursor: pointer;
  }
  .form-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
  }
  .form-row label {
    width: 72px;
    text-align: right;
    color: #555;
  }
  .form-row select {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background-color: white;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
