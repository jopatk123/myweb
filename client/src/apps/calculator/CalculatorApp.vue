<template>
  <!-- 按键只在计算器根节点（或其后代）获得焦点时生效，不监听 document，
       因此不会抢走其他窗口或输入框的按键。窗口激活时再把焦点收回到本应用。 -->
  <div
    ref="appEl"
    class="calculator-app"
    tabindex="0"
    role="application"
    aria-label="计算器"
    @keydown="onKeyDown"
    @paste="onPaste"
    @pointerdown="onAppPointerDown"
  >
    <div class="calculator-main">
      <CalculatorDisplay
        :display="display"
        :expression="expression"
        :announcement="announcement"
      />

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

    <CalculatorHistoryPanel
      :entries="calculationHistory"
      @clear-history="clearCalculationHistory"
    />
  </div>
</template>

<script setup>
  import { nextTick, onMounted, ref, watch } from 'vue';
  import CalculatorDisplay from './CalculatorDisplay.vue';
  import CalculatorHistoryPanel from './CalculatorHistoryPanel.vue';
  import CalculatorKeypad from './CalculatorKeypad.vue';
  import {
    appendDecimal,
    appendDigit,
    backspaceOperand,
    formatNumber,
    isEditableElement,
    parseDisplay,
    parsePastedNumber,
    performCalculation,
  } from './calculatorMath.js';

  const props = defineProps({
    isWindowActive: {
      type: Boolean,
      default: true,
    },
  });

  const appEl = ref(null);
  const display = ref('0');
  const expression = ref('');
  const announcement = ref('');
  const calculationHistory = ref([]);
  const historyEntryId = ref(0);
  const memory = ref(0);
  const previousValue = ref(null);
  const operator = ref(null);
  const waitingForOperand = ref(false);
  const isError = ref(false);
  const operandJustEntered = ref(false);
  // 当前操作数的 IEEE 值：计算结果保留全精度，展示层再格式化
  const currentValue = ref(0);
  const MAX_HISTORY_ENTRIES = 50;

  function setTypedDisplay(next) {
    const parsed = parseDisplay(next);
    if (parsed === null) return false;
    display.value = next;
    currentValue.value = parsed;
    return true;
  }

  function announce(message) {
    announcement.value = message;
  }

  function handlePasteEvent(pasteText) {
    const parsed = parsePastedNumber(pasteText);
    if (!parsed) return false;
    isError.value = false;
    operandJustEntered.value = true;
    waitingForOperand.value = false;
    setTypedDisplay(parsed.display);
    return true;
  }

  function onPaste(e) {
    const clipboardData = e.clipboardData || window.clipboardData;
    const text = clipboardData.getData('text');
    if (text && handlePasteEvent(text)) {
      e.preventDefault();
    }
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isEditableElement(e.target) && e.target !== appEl.value) return;

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
    }
  }

  function handleNumber(num) {
    isError.value = false;
    operandJustEntered.value = true;
    const next = appendDigit(display.value, num, waitingForOperand.value);
    if (next === null) return;
    const wasWaiting = waitingForOperand.value;
    if (!setTypedDisplay(next)) return;
    waitingForOperand.value = false;
    if (wasWaiting && previousValue.value === null && operator.value === null) {
      expression.value = '';
    }
  }

  function handleOperator(op) {
    if (isError.value) return;

    if (
      !operandJustEntered.value &&
      previousValue.value !== null &&
      operator.value !== null
    ) {
      operator.value = op;
      expression.value = `${formatOperand(previousValue.value)} ${getOperatorSymbol(op)}`;
      return;
    }

    const inputValue = currentValue.value;

    if (previousValue.value === null) {
      previousValue.value = inputValue;
    } else if (operator.value) {
      const result = performCalculation(
        previousValue.value,
        inputValue,
        operator.value
      );
      if (!commitResult(result)) return;
      previousValue.value = currentValue.value;
    }

    waitingForOperand.value = true;
    operator.value = op;
    operandJustEntered.value = false;
    expression.value = `${formatOperand(previousValue.value)} ${getOperatorSymbol(op)}`;
  }

  function handleEquals() {
    if (isError.value) return;

    const inputValue = currentValue.value;

    if (previousValue.value === null || operator.value === null) {
      return;
    }

    const result = performCalculation(
      previousValue.value,
      inputValue,
      operator.value
    );
    const completedExpression = `${formatOperand(previousValue.value)} ${getOperatorSymbol(operator.value)} ${formatOperand(inputValue)}`;

    if (!commitResult(result)) return;

    expression.value = `${completedExpression} =`;
    appendHistoryEntry(completedExpression, display.value);
    announce(`结果 ${display.value}`);
    previousValue.value = null;
    operator.value = null;
    waitingForOperand.value = true;
    operandJustEntered.value = false;
  }

  function handleClear() {
    display.value = '0';
    currentValue.value = 0;
    expression.value = '';
    previousValue.value = null;
    operator.value = null;
    waitingForOperand.value = false;
    isError.value = false;
    operandJustEntered.value = false;
    announce('已清除');
  }

  function handleDecimal() {
    isError.value = false;
    operandJustEntered.value = true;
    const next = appendDecimal(display.value, waitingForOperand.value);
    if (!setTypedDisplay(next)) return;
    waitingForOperand.value = false;
  }

  function handleBackspace() {
    if (isError.value) {
      handleClear();
      return;
    }

    // 运算符后仍在等待第二操作数：不要改写左边已确认的操作数
    if (waitingForOperand.value && operator.value !== null) {
      return;
    }

    // 等号/内存召回之后：进入编辑当前显示，使后续数字追加而不是整段替换
    if (waitingForOperand.value) {
      waitingForOperand.value = false;
    }

    operandJustEntered.value = true;
    setTypedDisplay(backspaceOperand(display.value));
  }

  function handleMemory(action) {
    if (isError.value) return;

    const operand = currentValue.value;

    switch (action) {
      case 'MC':
        memory.value = 0;
        announce('内存已清除');
        break;
      case 'MR': {
        const shown = formatNumber(memory.value);
        if (shown === null) {
          enterErrorState();
          return;
        }
        display.value = shown;
        currentValue.value = memory.value;
        waitingForOperand.value = true;
        operandJustEntered.value = true;
        isError.value = false;
        announce(`读取内存 ${shown}`);
        break;
      }
      case 'M+': {
        const next = memory.value + operand;
        if (!Number.isFinite(next)) return;
        memory.value = next;
        waitingForOperand.value = true;
        break;
      }
      case 'M-': {
        const next = memory.value - operand;
        if (!Number.isFinite(next)) return;
        memory.value = next;
        waitingForOperand.value = true;
        break;
      }
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

  function formatOperand(value) {
    return formatNumber(value) ?? String(value);
  }

  function enterErrorState() {
    isError.value = true;
    display.value = '错误';
    currentValue.value = 0;
    expression.value = '';
    previousValue.value = null;
    operator.value = null;
    waitingForOperand.value = true;
    operandJustEntered.value = false;
    announce('计算错误');
  }

  function commitResult(result) {
    if (!Number.isFinite(result)) {
      enterErrorState();
      return false;
    }
    const shown = formatNumber(result);
    if (shown === null) {
      enterErrorState();
      return false;
    }
    currentValue.value = result;
    display.value = shown;
    isError.value = false;
    return true;
  }

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

  function tryFocusCalculator() {
    const root = appEl.value;
    if (!root || typeof root.focus !== 'function') return;
    const active = document.activeElement;
    if (active && root.contains(active) && active !== root) return;
    root.focus();
  }

  function onAppPointerDown(e) {
    if (e.target.closest('button')) return;
    tryFocusCalculator();
  }

  watch(
    () => props.isWindowActive,
    active => {
      if (active) {
        nextTick(() => tryFocusCalculator());
      }
    }
  );

  onMounted(() => {
    if (props.isWindowActive) {
      nextTick(() => tryFocusCalculator());
    }
  });
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
    outline: none;
  }

  .calculator-app:focus-visible {
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.2),
      0 0 0 3px rgba(255, 255, 255, 0.7);
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
