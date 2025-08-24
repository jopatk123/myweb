<template>
  <div v-if="show" class="modal-backdrop" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <div class="title">{{ isEditMode ? '编辑分组' : '新建分组' }}</div>
        <button class="close" @click="close">✖</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label>名称</label>
          <input v-model="form.name" placeholder="例如：办公" />
        </div>
        <div class="form-row">
          <label>Slug</label>
          <input v-model="form.slug" placeholder="例如：office" />
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="submit">保存</button>
          <button class="btn" @click="close">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, computed } from 'vue';

  const props = defineProps({
    show: Boolean,
    mode: {
      type: String,
      default: 'create', // 'create' | 'edit'
    },
    group: {
      type: Object,
      default: null,
    },
  });

  const emit = defineEmits(['update:show', 'submit']);

  const form = ref({ name: '', slug: '' });

  const isEditMode = computed(() => props.mode === 'edit');

  watch(
    () => props.show,
    newVal => {
      if (newVal) {
        if (isEditMode.value && props.group) {
          form.value = {
            name: props.group.name || '',
            slug: props.group.slug || '',
          };
        } else {
          form.value = { name: '', slug: '' };
        }
      }
    }
  );

  const close = () => {
    emit('update:show', false);
  };

  const submit = () => {
    if (!form.value.name || !form.value.name.trim()) {
      alert('请填写分组名称');
      return;
    }
    emit('submit', { ...form.value });
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
  .form-row input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
