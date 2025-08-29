<template>
  <div class="form-group">
    <label class="checkbox-label">
      <input
        :checked="hasPassword"
        @change="$emit('update:hasPassword', $event.target.checked)"
        type="checkbox"
        class="checkbox-input"
      />
      <span class="checkbox-text">设置房间密码</span>
    </label>
    <input
      v-if="hasPassword"
      :value="password"
      @input="$emit('update:password', $event.target.value)"
      type="password"
      placeholder="输入房间密码（可选）"
      maxlength="20"
      class="form-input password-input"
    />
  </div>
</template>

<script setup>
defineProps({
  hasPassword: { type: Boolean, required: true },
  password: { type: String, required: true }
})

defineEmits(['update:hasPassword', 'update:password'])
</script>

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-text {
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.form-input::placeholder {
  color: #999;
}

.password-input {
  margin-top: 4px;
}
</style>
