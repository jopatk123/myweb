<template>
  <div class="calculator-keypad">
    <!-- 第一行：内存操作 -->
    <div class="keypad-row">
      <button class="key memory-key" @click="$emit('memory', 'MC')">MC</button>
      <button class="key memory-key" @click="$emit('memory', 'MR')">MR</button>
      <button class="key memory-key" @click="$emit('memory', 'M+')">M+</button>
      <button class="key memory-key" @click="$emit('memory', 'M-')">M-</button>
    </div>
    
    <!-- 第二行：清除和退格 -->
    <div class="keypad-row">
      <button class="key function-key" @click="$emit('clear')">C</button>
      <button class="key function-key" @click="$emit('backspace')">⌫</button>
      <button class="key operator-key" @click="$emit('operator', '%')">%</button>
      <button class="key operator-key" @click="$emit('operator', '/')">÷</button>
    </div>
    
    <!-- 第三行：7-9 -->
    <div class="keypad-row">
      <button class="key number-key" @click="$emit('number', '7')">7</button>
      <button class="key number-key" @click="$emit('number', '8')">8</button>
      <button class="key number-key" @click="$emit('number', '9')">9</button>
      <button class="key operator-key" @click="$emit('operator', '*')">×</button>
    </div>
    
    <!-- 第四行：4-6 -->
    <div class="keypad-row">
      <button class="key number-key" @click="$emit('number', '4')">4</button>
      <button class="key number-key" @click="$emit('number', '5')">5</button>
      <button class="key number-key" @click="$emit('number', '6')">6</button>
      <button class="key operator-key" @click="$emit('operator', '-')">−</button>
    </div>
    
    <!-- 第五行：1-3 -->
    <div class="keypad-row">
      <button class="key number-key" @click="$emit('number', '1')">1</button>
      <button class="key number-key" @click="$emit('number', '2')">2</button>
      <button class="key number-key" @click="$emit('number', '3')">3</button>
      <button class="key operator-key" @click="$emit('operator', '+')">+</button>
    </div>
    
    <!-- 第六行：0和小数点 -->
    <div class="keypad-row">
      <button class="key number-key zero-key" @click="$emit('number', '0')">0</button>
      <button class="key number-key" @click="$emit('decimal')">.</button>
      <button class="key equals-key" @click="$emit('equals')">=</button>
    </div>
  </div>
</template>

<script setup>
// 定义事件
defineEmits(['number', 'operator', 'clear', 'equals', 'decimal', 'backspace', 'memory']);
</script>

<style scoped>
.calculator-keypad {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.keypad-row {
  display: flex;
  gap: 8px;
}

.key {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  outline: none;
}

.key:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.key:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.number-key {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  color: #495057;
  border: 1px solid #dee2e6;
}

.number-key:hover {
  background: linear-gradient(135deg, #e9ecef, #dee2e6);
}

.operator-key {
  background: linear-gradient(135deg, #ffc107, #ffb300);
  color: #212529;
  border: 1px solid #ffb300;
}

.operator-key:hover {
  background: linear-gradient(135deg, #ffb300, #ff8f00);
}

.function-key {
  background: linear-gradient(135deg, #6c757d, #5a6268);
  color: white;
  border: 1px solid #5a6268;
}

.function-key:hover {
  background: linear-gradient(135deg, #5a6268, #495057);
}

.memory-key {
  background: linear-gradient(135deg, #17a2b8, #138496);
  color: white;
  border: 1px solid #138496;
  font-size: 0.9rem;
}

.memory-key:hover {
  background: linear-gradient(135deg, #138496, #117a8b);
}

.equals-key {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border: 1px solid #20c997;
  flex: 2;
}

.equals-key:hover {
  background: linear-gradient(135deg, #20c997, #1ea085);
}

.zero-key {
  flex: 2;
}

@media (max-width: 768px) {
  .key {
    height: 40px;
    font-size: 1rem;
  }
  
  .memory-key {
    font-size: 0.8rem;
  }
  
  .keypad-row {
    gap: 6px;
  }
}
</style>
