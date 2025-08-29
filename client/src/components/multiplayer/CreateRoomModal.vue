<!--
  创建房间弹窗组件 - 可复用的房间创建对话框
  用于收集房间创建参数并创建新房间
-->
<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-container">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <!-- 房间名称 -->
        <div class="form-group">
          <label>房间名称</label>
          <input
            v-model="formData.name"
            type="text"
            :placeholder="namePlaceholder"
            maxlength="30"
            class="form-input"
            @keyup.enter="handleCreate"
          />
        </div>

        <!-- 游戏模式选择 -->
        <div class="form-group">
          <label>游戏模式</label>
          <slot name="mode-selector" :selectedMode="formData.mode" :onModeChange="updateMode">
            <div class="mode-selector">
              <div 
                v-for="mode in gameModes" 
                :key="mode.value"
                class="mode-option"
                :class="{ active: formData.mode === mode.value }"
                @click="formData.mode = mode.value"
              >
                <div class="mode-icon">{{ mode.icon }}</div>
                <div class="mode-info">
                  <div class="mode-title">{{ mode.label }}</div>
                  <div class="mode-desc">{{ mode.description }}</div>
                </div>
              </div>
            </div>
          </slot>
        </div>

        <!-- 最大玩家数 -->
        <div class="form-group">
          <label>最大玩家数</label>
          <div class="player-count-selector">
            <button
              v-for="count in playerCountOptions"
              :key="count"
              type="button"
              class="count-option"
              :class="{ active: formData.maxPlayers === count }"
              @click="formData.maxPlayers = count"
            >
              {{ count }}人
            </button>
          </div>
        </div>

        <!-- 房间设置插槽 -->
        <slot name="additional-settings" :formData="formData" :updateFormData="updateFormData">
          <!-- 游戏特定的额外设置将在这里显示 -->
        </slot>

        <!-- 密码设置 -->
        <div class="form-group">
          <label class="checkbox-label">
            <input
              v-model="formData.hasPassword"
              type="checkbox"
              class="checkbox-input"
            />
            <span class="checkbox-text">设置房间密码</span>
          </label>
          <input
            v-if="formData.hasPassword"
            v-model="formData.password"
            type="password"
            placeholder="输入房间密码（可选）"
            maxlength="20"
            class="form-input password-input"
          />
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="handleClose">
          取消
        </button>
        <button 
          class="btn-primary" 
          @click="handleCreate"
          :disabled="!isFormValid || loading"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? '创建中...' : '创建房间' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreateRoomModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '创建房间'
    },
    namePlaceholder: {
      type: String,
      default: '输入房间名称'
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    // 游戏模式配置
    gameModes: {
      type: Array,
      default: () => [
        {
          value: 'shared',
          icon: '🤝',
          label: '共享模式',
          description: '多人控制一条蛇'
        },
        {
          value: 'competitive',
          icon: '⚔️',
          label: '竞技模式',
          description: '双人对战'
        }
      ]
    },
    // 玩家数选项
    playerCountOptions: {
      type: Array,
      default: () => [2, 4, 6, 8]
    },
    // 默认表单数据
    defaultFormData: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['close', 'create'],
  data() {
    return {
      formData: {
        name: '',
        mode: 'shared',
        maxPlayers: 2,
        hasPassword: false,
        password: '',
        ...this.defaultFormData
      }
    };
  },
  computed: {
    isFormValid() {
      return this.formData.name.trim().length > 0 && 
             this.formData.mode &&
             this.formData.maxPlayers >= 1 &&
             (!this.formData.hasPassword || this.formData.password.trim().length > 0);
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.resetForm();
        // 聚焦到房间名称输入框
        this.$nextTick(() => {
          const input = this.$el.querySelector('.form-input');
          if (input) input.focus();
        });
      }
    },
    defaultFormData: {
      handler(newVal) {
        this.formData = { ...this.formData, ...newVal };
      },
      deep: true
    }
  },
  methods: {
    handleClose() {
      this.$emit('close');
    },
    handleCreate() {
      if (!this.isFormValid || this.loading) return;
      
      const roomData = {
        ...this.formData,
        name: this.formData.name.trim(),
        password: this.formData.hasPassword ? this.formData.password.trim() : null
      };
      
      this.$emit('create', roomData);
    },
    updateMode(mode) {
      this.formData.mode = mode;
    },
    updateFormData(updates) {
      Object.assign(this.formData, updates);
    },
    resetForm() {
      this.formData = {
        name: '',
        mode: this.gameModes[0]?.value || 'shared',
        maxPlayers: this.playerCountOptions[0] || 2,
        hasPassword: false,
        password: '',
        ...this.defaultFormData
      };
    }
  }
}
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
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
  background: linear-gradient(135deg, #f8f9fa, #ffffff);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #212529;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6c757d;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.mode-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #ffffff;
}

.mode-option:hover {
  border-color: #007bff;
  background: #f8f9ff;
}

.mode-option.active {
  border-color: #007bff;
  background: linear-gradient(135deg, #e7f3ff, #f0f8ff);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.mode-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 8px;
}

.mode-option.active .mode-icon {
  background: #007bff;
  color: white;
}

.mode-info {
  flex: 1;
}

.mode-title {
  font-weight: 600;
  color: #212529;
  margin-bottom: 2px;
}

.mode-desc {
  font-size: 12px;
  color: #6c757d;
}

.player-count-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.count-option {
  padding: 8px 16px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  color: #495057;
}

.count-option:hover {
  border-color: #007bff;
  color: #007bff;
}

.count-option.active {
  border-color: #007bff;
  background: #007bff;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 12px;
  font-weight: 500;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.password-input {
  margin-top: 12px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 16px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.btn-secondary,
.btn-primary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

.btn-primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  min-width: 120px;
  justify-content: center;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3, #004085);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 600px) {
  .modal-container {
    max-width: 95vw;
    margin: 10px;
  }
  
  .mode-selector {
    gap: 8px;
  }
  
  .mode-option {
    padding: 12px;
  }
  
  .player-count-selector {
    justify-content: center;
  }
  
  .modal-footer {
    flex-direction: column-reverse;
  }
  
  .btn-secondary,
  .btn-primary {
    width: 100%;
  }
}
</style>
