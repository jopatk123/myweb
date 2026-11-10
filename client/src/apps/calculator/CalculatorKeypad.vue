<template>
  <div class="calculator-keypad" role="group" aria-label="计算器按键">
    <div class="keypad-row">
      <button
        type="button"
        class="key memory-key"
        aria-label="清除内存"
        @click="$emit('memory', 'MC')"
      >
        MC
      </button>
      <button
        type="button"
        class="key memory-key"
        aria-label="读取内存"
        @click="$emit('memory', 'MR')"
      >
        MR
      </button>
      <button
        type="button"
        class="key memory-key"
        aria-label="内存加"
        @click="$emit('memory', 'M+')"
      >
        M+
      </button>
      <button
        type="button"
        class="key memory-key"
        aria-label="内存减"
        @click="$emit('memory', 'M-')"
      >
        M-
      </button>
    </div>

    <div class="keypad-row">
      <button
        type="button"
        class="key function-key"
        aria-label="清除"
        @click="$emit('clear')"
      >
        C
      </button>
      <button
        type="button"
        class="key function-key"
        aria-label="退格"
        @click="$emit('backspace')"
      >
        ⌫
      </button>
      <button
        type="button"
        class="key operator-key"
        aria-label="取模"
        @click="$emit('operator', '%')"
      >
        %
      </button>
      <button
        type="button"
        class="key operator-key"
        aria-label="除"
        @click="$emit('operator', '/')"
      >
        ÷
      </button>
    </div>

    <div class="keypad-row">
      <button
        type="button"
        class="key number-key"
        aria-label="7"
        @click="$emit('number', '7')"
      >
        7
      </button>
      <button
        type="button"
        class="key number-key"
        aria-label="8"
        @click="$emit('number', '8')"
      >
        8
      </button>
      <button
        type="button"
        class="key number-key"
        aria-label="9"
        @click="$emit('number', '9')"
      >
        9
      </button>
      <button
        type="button"
        class="key operator-key"
        aria-label="乘"
        @click="$emit('operator', '*')"
      >
        ×
      </button>
    </div>

    <div class="keypad-row">
      <button
        type="button"
        class="key number-key"
        aria-label="4"
        @click="$emit('number', '4')"
      >
        4
      </button>
      <button
        type="button"
        class="key number-key"
        aria-label="5"
        @click="$emit('number', '5')"
      >
        5
      </button>
      <button
        type="button"
        class="key number-key"
        aria-label="6"
        @click="$emit('number', '6')"
      >
        6
      </button>
      <button
        type="button"
        class="key operator-key"
        aria-label="减"
        @click="$emit('operator', '-')"
      >
        −
      </button>
    </div>

    <div class="keypad-row">
      <button
        type="button"
        class="key number-key"
        aria-label="1"
        @click="$emit('number', '1')"
      >
        1
      </button>
      <button
        type="button"
        class="key number-key"
        aria-label="2"
        @click="$emit('number', '2')"
      >
        2
      </button>
      <button
        type="button"
        class="key number-key"
        aria-label="3"
        @click="$emit('number', '3')"
      >
        3
      </button>
      <button
        type="button"
        class="key operator-key"
        aria-label="加"
        @click="$emit('operator', '+')"
      >
        +
      </button>
    </div>

    <div class="keypad-row">
      <button
        type="button"
        class="key number-key zero-key"
        aria-label="0"
        @click="$emit('number', '0')"
      >
        0
      </button>
      <button
        type="button"
        class="key number-key"
        aria-label="小数点"
        @click="$emit('decimal')"
      >
        .
      </button>
      <button
        type="button"
        class="key equals-key"
        aria-label="等于"
        @click="$emit('equals')"
      >
        =
      </button>
    </div>
  </div>
</template>

<script setup>
  defineEmits([
    'number',
    'operator',
    'clear',
    'equals',
    'decimal',
    'backspace',
    'memory',
  ]);
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
  }

  .key:focus {
    outline: none;
  }

  .key:focus-visible {
    outline: 3px solid #ffffff;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.9);
    z-index: 1;
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
