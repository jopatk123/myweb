<template>
  <!-- 键盘/粘贴事件绑定在根元素上：事件仅会来自计算器内部（自身或后代元素），
       天然不会劫持外部按键，因此无需额外焦点守卫 -->
  <div class="calculator-app" @keydown="onKeyDown" @paste="onPaste">
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
  import { ref } from 'vue';
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
  // 错误状态（除以 0、结果溢出等），置位后所有计算操作被忽略，直到开始新输入
  const isError = ref(false);
  // 标记当前 display 是否为刚输入完成的操作数：
  // 连续按运算符时若为 false 则仅替换运算符，避免 5 + × 被误算成 5+5
  const operandJustEntered = ref(false);
  const MAX_HISTORY_ENTRIES = 50;

  function handlePasteEvent(pasteText) {
    // 仅接受纯数字（允许小数点和负号）
    const trimmed = pasteText.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      // 将粘贴的数替换当前 display
      display.value = trimmed;
      waitingForOperand.value = true;
      isError.value = false;
      operandJustEntered.value = true;
      return true;
    }
    return false;
  }

  function onPaste(e) {
    const clipboardData = e.clipboardData || window.clipboardData;
    const text = clipboardData.getData('text');
    if (text && handlePasteEvent(text)) {
      e.preventDefault();
    }
  }

  function onKeyDown(e) {
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

    // Escape / Delete 清除，对齐常见计算器键盘习惯
    if (key === 'Escape' || key === 'Delete') {
      e.preventDefault();
      handleClear();
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

  // 处理数字输入
  function handleNumber(num) {
    isError.value = false;
    operandJustEntered.value = true;
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
    if (isError.value) return;

    // 连续按运算符：仅替换当前运算符，不提前触发计算
    if (
      !operandJustEntered.value &&
      previousValue.value !== null &&
      operator.value !== null
    ) {
      operator.value = op;
      expression.value = `${previousValue.value} ${getOperatorSymbol(op)}`;
      return;
    }

    const inputValue = parseFloat(display.value);

    if (previousValue.value === null) {
      previousValue.value = inputValue;
    } else if (operator.value) {
      const result = performCalculation(
        previousValue.value,
        inputValue,
        operator.value
      );
      if (!commitResult(result)) return;
      previousValue.value = result;
    }

    waitingForOperand.value = true;
    operator.value = op;
    operandJustEntered.value = false;
    expression.value = `${previousValue.value} ${getOperatorSymbol(op)}`;
  }

  // 处理等号
  function handleEquals() {
    if (isError.value) return;

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

    if (!commitResult(result)) return;

    display.value = String(result);
    expression.value = `${completedExpression} =`;
    appendHistoryEntry(completedExpression, String(result));
    previousValue.value = null;
    operator.value = null;
    waitingForOperand.value = true;
    operandJustEntered.value = false;
  }

  // 处理清除
  function handleClear() {
    display.value = '0';
    expression.value = '';
    previousValue.value = null;
    operator.value = null;
    waitingForOperand.value = false;
    isError.value = false;
    operandJustEntered.value = false;
  }

  // 处理小数点
  function handleDecimal() {
    isError.value = false;
    operandJustEntered.value = true;
    if (waitingForOperand.value) {
      display.value = '0.';
      waitingForOperand.value = false;
    } else if (display.value.indexOf('.') === -1) {
      display.value += '.';
    }
  }

  // 处理退格
  function handleBackspace() {
    // 错误态下退格等同于清除，避免对 '错误' 文本做无意义的字符删除
    if (isError.value) {
      handleClear();
      return;
    }
    operandJustEntered.value = true;
    if (display.value.length === 1) {
      display.value = '0';
    } else {
      display.value = display.value.slice(0, -1);
    }
  }

  // 处理内存操作
  function handleMemory(action) {
    if (isError.value) return;

    const currentValue = parseFloat(display.value);

    switch (action) {
      case 'MC': // Memory Clear
        memory.value = 0;
        break;
      case 'MR': // Memory Recall
        display.value = String(memory.value);
        waitingForOperand.value = true;
        operandJustEntered.value = true;
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
  // 浮点运算可能出现精度误差（如 0.1+0.2=0.30000000000000004），
  // 通过 Math.round 取整到 10 位小数以消除误差，同时保留足够精度。
  function roundResult(value) {
    if (!Number.isFinite(value)) return value;
    return Math.round(value * 1e10) / 1e10;
  }

  // 提交计算结果：结果非法（除以 0、溢出等）时进入错误态并返回 false
  function commitResult(result) {
    if (!Number.isFinite(result)) {
      isError.value = true;
      display.value = '错误';
      expression.value = '';
      previousValue.value = null;
      operator.value = null;
      waitingForOperand.value = true;
      operandJustEntered.value = false;
      return false;
    }
    display.value = String(result);
    return true;
  }

  function performCalculation(a, b, op) {
    let result;
    switch (op) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '*':
        result = a * b;
        break;
      case '/':
        // 除以 0 得 Infinity/NaN，由 commitResult 统一转为错误态
        result = a / b;
        break;
      case '%':
        // 取模除数为 0 得 NaN，由 commitResult 统一转为错误态
        result = a % b;
        break;
      default:
        result = b;
    }
    return roundResult(result);
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
