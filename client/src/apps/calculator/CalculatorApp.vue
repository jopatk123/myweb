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
    <!-- 左侧：主计算器区域 -->
    <div class="calculator-main">
      <CalculatorDisplay :display="display" :expression="expression" />

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

    <!-- 右侧：历史记录侧边栏 -->
    <CalculatorHistoryPanel
      :entries="calculationHistory"
      @clear-history="clearCalculationHistory"
    />
  </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  import CalculatorDisplay from './CalculatorDisplay.vue';
  import CalculatorHistoryPanel from './CalculatorHistoryPanel.vue';
  import CalculatorKeypad from './CalculatorKeypad.vue';

  // 计算器状态
  const display = ref('0');
  const expression = ref('');
  const calculationHistory = ref([]);
  const historyEntryId = ref(0);
  const memory = ref(0);
  const previousValue = ref(null);
  const operator = ref(null);
  const waitingForOperand = ref(false);
  const MAX_HISTORY_ENTRIES = 6;
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
      if (previousValue.value === null && operator.value === null) {
        expression.value = '';
      }
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
    expression.value = `${previousValue.value} ${getOperatorSymbol(op)}`;
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
    const completedExpression = `${previousValue.value} ${getOperatorSymbol(operator.value)} ${inputValue}`;

    display.value = String(result);
    expression.value = `${completedExpression} =`;
    appendHistoryEntry(completedExpression, String(result));
    previousValue.value = null;
    operator.value = null;
    waitingForOperand.value = true;
  }

  // 处理清除
  function handleClear() {
    display.value = '0';
    expression.value = '';
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

  function clearCalculationHistory() {
    calculationHistory.value = [];
  }

  function appendHistoryEntry(completedExpression, result) {
    historyEntryId.value += 1;
    calculationHistory.value = [
      {
        id: historyEntryId.value,
        expression: completedExpression,
        result,
      },
      ...calculationHistory.value,
    ].slice(0, MAX_HISTORY_ENTRIES);
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
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 12px;
    width: 100%;
    padding: 16px;
    box-sizing: border-box;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    min-width: 0;
  }

  .calculator-main {
    flex: 1;
    min-width: 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 520px) {
    .calculator-app {
      flex-direction: column;
      padding: 12px;
      gap: 10px;
    }

    .calculator-main {
      padding: 12px;
    }
  }
</style>
