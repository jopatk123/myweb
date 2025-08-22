<template>
  <!-- 使根元素可聚焦以接收键盘事件，仅在获得焦点时处理键盘输入 -->
  <div
    class="calculator-app"
    ref="appEl"
    tabindex="0"
    @focus="onFocus"
    @blur="onBlur"
    @keydown="onKeyDown"
    @paste="onPaste"
    @click="focusApp"
  >
    <CalculatorHeader />

    <div class="calculator-container">
      <CalculatorDisplay :display="display" :history="history" />

      <CalculatorKeypad
        @number="handleNumber"
        @operator="handleOperator"
        @clear="handleClear"
        @equals="handleEquals"
        @decimal="handleDecimal"
        @backspace="handleBackspace"
        @memory="handleMemory"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
  import CalculatorHeader from './CalculatorHeader.vue';
  import CalculatorDisplay from './CalculatorDisplay.vue';
  import CalculatorKeypad from './CalculatorKeypad.vue';

  // 计算器状态
  const display = ref('0');
  const history = ref('');
  const memory = ref(0);
  const previousValue = ref(null);
  const operator = ref(null);
  const waitingForOperand = ref(false);
  // 聚焦状态 (只有聚焦时才处理键盘事件)
  const isFocused = ref(false);
  const appEl = ref(null);

  function focusApp() {
    // 点击时让根元素获得焦点
    if (appEl.value && typeof appEl.value.focus === 'function') {
      appEl.value.focus();
    }
  }

  function onFocus() {
    isFocused.value = true;
  }

  function onBlur() {
    isFocused.value = false;
  }

  function handlePasteEvent(pasteText) {
    // 仅接受纯数字（允许小数点和负号）
    const trimmed = pasteText.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      // 将粘贴的数替换当前 display
      display.value = trimmed;
      waitingForOperand.value = true;
      return true;
    }
    return false;
  }

  function onPaste(e) {
    if (!isFocused.value) return;
    const clipboardData = e.clipboardData || window.clipboardData;
    const text = clipboardData.getData('text');
    if (text && handlePasteEvent(text)) {
      e.preventDefault();
    }
  }

  function onKeyDown(e) {
    if (!isFocused.value) return;

    // 处理 Ctrl+V 的情况在 paste 事件中处理，这里处理其他按键
    const key = e.key;
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      handleNumber(key);
      return;
    }

    if (key === '.' || key === ',') {
      e.preventDefault();
      handleDecimal();
      return;
    }

    if (key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
      return;
    }

    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      handleEquals();
      return;
    }

    const opMap = {
      '+': '+',
      '-': '-',
      '*': '*',
      x: '*',
      X: '*',
      '/': '/',
      '%': '%',
    };

    if (opMap[key]) {
      e.preventDefault();
      handleOperator(opMap[key]);
      return;
    }
  }

  // 安全：当组件卸载时确保焦点相关引用不会泄漏
  onBeforeUnmount(() => {
    isFocused.value = false;
  });

  onMounted(() => {
    // 组件挂载时尝试获取焦点，确保打开时即可接收键盘输入
    focusApp();
  });

  // 处理数字输入
  function handleNumber(num) {
    if (waitingForOperand.value) {
      display.value = num;
      waitingForOperand.value = false;
    } else {
      display.value = display.value === '0' ? num : display.value + num;
    }
  }

  // 处理运算符
  function handleOperator(op) {
    const inputValue = parseFloat(display.value);

    if (previousValue.value === null) {
      previousValue.value = inputValue;
    } else if (operator.value) {
      const result = performCalculation(
        previousValue.value,
        inputValue,
        operator.value
      );
      display.value = String(result);
      previousValue.value = result;
    }

    waitingForOperand.value = true;
    operator.value = op;
    history.value = `${previousValue.value} ${getOperatorSymbol(op)}`;
  }

  // 处理等号
  function handleEquals() {
    const inputValue = parseFloat(display.value);

    if (previousValue.value === null || operator.value === null) {
      return;
    }

    const result = performCalculation(
      previousValue.value,
      inputValue,
      operator.value
    );
    display.value = String(result);
    history.value = `${previousValue.value} ${getOperatorSymbol(operator.value)} ${inputValue} =`;
    previousValue.value = null;
    operator.value = null;
    waitingForOperand.value = true;
  }

  // 处理清除
  function handleClear() {
    display.value = '0';
    history.value = '';
    previousValue.value = null;
    operator.value = null;
    waitingForOperand.value = false;
  }

  // 处理小数点
  function handleDecimal() {
    if (waitingForOperand.value) {
      display.value = '0.';
      waitingForOperand.value = false;
    } else if (display.value.indexOf('.') === -1) {
      display.value += '.';
    }
  }

  // 处理退格
  function handleBackspace() {
    if (display.value.length === 1) {
      display.value = '0';
    } else {
      display.value = display.value.slice(0, -1);
    }
  }

  // 处理内存操作
  function handleMemory(action) {
    const currentValue = parseFloat(display.value);

    switch (action) {
      case 'MC': // Memory Clear
        memory.value = 0;
        break;
      case 'MR': // Memory Recall
        display.value = String(memory.value);
        waitingForOperand.value = true;
        break;
      case 'M+': // Memory Add
        memory.value += currentValue;
        waitingForOperand.value = true;
        break;
      case 'M-': // Memory Subtract
        memory.value -= currentValue;
        waitingForOperand.value = true;
        break;
    }
  }

  // 执行计算
  function performCalculation(a, b, op) {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return b !== 0 ? a / b : 0;
      case '%':
        return a % b;
      default:
        return b;
    }
  }

  // 获取运算符符号
  function getOperatorSymbol(op) {
    const symbols = {
      '+': '+',
      '-': '−',
      '*': '×',
      '/': '÷',
      '%': '%',
    };
    return symbols[op] || op;
  }
</script>

<style scoped>
  .calculator-app {
    display: block;
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    /* 允许在容器内占满可用宽度，移除 max-width 限制 */
    min-width: 0;
  }

  .calculator-container {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    /* 确保内部内容不超出边界 */
    box-sizing: border-box;
    width: 100%;
    /* 使用固定布局：卡片宽度不会随内容缩放 */
    max-width: none;
  }

  @media (max-width: 768px) {
    .calculator-app {
      padding: 12px;
      min-width: 280px;
    }

    .calculator-container {
      padding: 12px;
    }
  }
</style>
