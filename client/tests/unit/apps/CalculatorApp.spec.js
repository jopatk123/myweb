import { describe, expect, it } from 'vitest';
import { fireEvent, render, within } from '@testing-library/vue';
import CalculatorApp from '@/apps/calculator/CalculatorApp.vue';

async function clickButtons(getByRole, labels) {
  for (const label of labels) {
    await fireEvent.click(getByRole('button', { name: label }));
  }
}

describe('CalculatorApp', () => {
  it('replaces the banner area with a compact history panel', () => {
    const { getByTestId, getByText, queryByText } = render(CalculatorApp);

    expect(getByTestId('calculator-history-panel')).toBeInTheDocument();
    expect(getByText('暂无记录')).toBeInTheDocument();
    expect(queryByText('科学计算器')).not.toBeInTheDocument();
  });

  it('records completed calculations and keeps the current expression visible', async () => {
    const { getByRole, getByTestId, getByLabelText } = render(CalculatorApp);

    await clickButtons(getByRole, ['1', '+', '2', '=']);

    expect(getByTestId('calculator-display')).toHaveTextContent('3');
    expect(getByTestId('calculator-expression')).toHaveTextContent('1 + 2 =');

    const historyList = getByLabelText('计算历史');
    expect(within(historyList).getByText('1 + 2')).toBeInTheDocument();
    expect(within(historyList).getByText('= 3')).toBeInTheDocument();
  });

  it('shows newest history first and supports clearing history', async () => {
    const { getByRole, getByLabelText, getByText, queryByLabelText } =
      render(CalculatorApp);

    await clickButtons(getByRole, ['1', '+', '2', '=']);
    await clickButtons(getByRole, ['4', '×', '5', '=']);

    const historyList = getByLabelText('计算历史');
    const historyItems = within(historyList).getAllByRole('listitem');

    expect(historyItems).toHaveLength(2);
    expect(historyItems[0]).toHaveTextContent('4 × 5');
    expect(historyItems[0]).toHaveTextContent('= 20');
    expect(historyItems[1]).toHaveTextContent('1 + 2');
    expect(historyItems[1]).toHaveTextContent('= 3');

    await fireEvent.click(getByRole('button', { name: '清空' }));

    expect(queryByLabelText('计算历史')).not.toBeInTheDocument();
    expect(getByText('暂无记录')).toBeInTheDocument();
  });

  it('消除浮点运算精度误差（0.1 + 0.2 = 0.3）', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['0', '.', '1', '+', '0', '.', '2', '=']);

    // 未做精度处理时显示 0.30000000000000004，处理后应为 0.3
    expect(getByTestId('calculator-display')).toHaveTextContent('0.3');
  });

  it('除以 0 进入错误态，且错误后可直接开始新计算', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['5', '÷', '0', '=']);

    expect(getByTestId('calculator-display')).toHaveTextContent('错误');
    expect(getByTestId('calculator-expression')).toHaveTextContent('');

    // 错误态下按数字应开始全新计算，而不是把 '错误' 当作操作数
    await clickButtons(getByRole, ['8', '+', '2', '=']);
    expect(getByTestId('calculator-display')).toHaveTextContent('10');
  });

  it('取模除数为 0 同样进入错误态', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['5', '%', '0', '=']);

    expect(getByTestId('calculator-display')).toHaveTextContent('错误');
  });

  it('连续按运算符仅替换运算符，不提前计算（5 + × 3 = 15）', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['5', '+', '×', '3', '=']);

    expect(getByTestId('calculator-display')).toHaveTextContent('15');
    expect(getByTestId('calculator-expression')).toHaveTextContent('5 × 3 =');
  });

  it('按下 Escape 键清除当前计算', async () => {
    const { getByRole, getByTestId, container } = render(CalculatorApp);

    await clickButtons(getByRole, ['5', '+', '3', '=']);
    expect(getByTestId('calculator-display')).toHaveTextContent('8');

    const appEl = container.querySelector('.calculator-app');
    await fireEvent.keyDown(appEl, { key: 'Escape' });

    expect(getByTestId('calculator-display')).toHaveTextContent('0');
    expect(getByTestId('calculator-expression')).toHaveTextContent('');
  });
});

describe('CalculatorApp keyboard and clipboard', () => {
  const getAppEl = container => container.querySelector('.calculator-app');

  const pressKeys = async (appEl, keys) => {
    for (const key of keys) {
      await fireEvent.keyDown(appEl, { key });
    }
  };

  const pasteText = async (appEl, text) => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    event.clipboardData = { getData: () => text };
    appEl.dispatchEvent(event);
    await Promise.resolve();
  };

  it('键盘数字与小数点组成操作数，逗号同小数点', async () => {
    const { getByTestId, container } = render(CalculatorApp);
    const appEl = getAppEl(container);

    await pressKeys(appEl, ['5', '8', '.']);
    expect(getByTestId('calculator-display')).toHaveTextContent('58.');

    await pressKeys(appEl, [',']);
    expect(getByTestId('calculator-display')).toHaveTextContent('58.');
  });

  it('键盘运算符（含 x/X）与 Enter/等号完成计算', async () => {
    const { getByTestId, container } = render(CalculatorApp);
    const appEl = getAppEl(container);

    await pressKeys(appEl, ['5', '+', '3', 'Enter']);
    expect(getByTestId('calculator-display')).toHaveTextContent('8');
    expect(getByTestId('calculator-expression')).toHaveTextContent('5 + 3 =');

    await pressKeys(appEl, ['4', 'x', '2', '=']);
    expect(getByTestId('calculator-display')).toHaveTextContent('8');

    await pressKeys(appEl, ['5', 'X', '2', '=']);
    expect(getByTestId('calculator-display')).toHaveTextContent('10');
  });

  it('键盘退格与 Delete/Escape 清除', async () => {
    const { getByTestId, container } = render(CalculatorApp);
    const appEl = getAppEl(container);

    await pressKeys(appEl, ['1', '2', 'Backspace']);
    expect(getByTestId('calculator-display')).toHaveTextContent('1');

    await pressKeys(appEl, ['Delete']);
    expect(getByTestId('calculator-display')).toHaveTextContent('0');
  });

  it('无关键（字母等）不会改变显示', async () => {
    const { getByTestId, container } = render(CalculatorApp);
    const appEl = getAppEl(container);

    await pressKeys(appEl, ['a', 'F5']);
    expect(getByTestId('calculator-display')).toHaveTextContent('0');
  });

  it('粘贴纯数字替换当前显示，非法内容被忽略', async () => {
    const { getByTestId, container } = render(CalculatorApp);
    const appEl = getAppEl(container);

    await pasteText(appEl, '42');
    expect(getByTestId('calculator-display')).toHaveTextContent('42');

    await pasteText(appEl, 'abc');
    expect(getByTestId('calculator-display')).toHaveTextContent('42');

    await pasteText(appEl, ' -3.5 ');
    expect(getByTestId('calculator-display')).toHaveTextContent('-3.5');
  });

  it('内存操作：M+ / M- 累计、MR 取回、MC 清零', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['5', 'M+']);
    await clickButtons(getByRole, ['MR']);
    expect(getByTestId('calculator-display')).toHaveTextContent('5');

    await clickButtons(getByRole, ['3', 'M-']);
    await clickButtons(getByRole, ['MR']);
    expect(getByTestId('calculator-display')).toHaveTextContent('2');

    await clickButtons(getByRole, ['MC']);
    await clickButtons(getByRole, ['MR']);
    expect(getByTestId('calculator-display')).toHaveTextContent('0');
  });

  it('错误态下退格等同清除，且内存与等号操作被忽略', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['5', '÷', '0', '=']);
    expect(getByTestId('calculator-display')).toHaveTextContent('错误');

    await clickButtons(getByRole, ['⌫']);
    expect(getByTestId('calculator-display')).toHaveTextContent('0');

    await clickButtons(getByRole, ['5', '÷', '0', '=']);
    await clickButtons(getByRole, ['M+']);
    await clickButtons(getByRole, ['MR']);
    expect(getByTestId('calculator-display')).toHaveTextContent('错误');
  });

  it('没有运算符时按等号不改变显示', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['5', '=']);
    expect(getByTestId('calculator-display')).toHaveTextContent('5');
    expect(getByTestId('calculator-expression')).toHaveTextContent('');
  });

  it('结果后输入小数点从 0. 开始新操作数', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['1', '+', '2', '=', '.']);
    expect(getByTestId('calculator-display')).toHaveTextContent('0.');
  });

  it('取模与减法路径正确（10 % 3 = 1）', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['1', '0', '%', '3', '=']);
    expect(getByTestId('calculator-display')).toHaveTextContent('1');
  });

  it('连续按运算符时表达式实时更新为最新符号', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['5', '+', '×']);
    expect(getByTestId('calculator-expression')).toHaveTextContent('5 ×');
    expect(getByTestId('calculator-display')).toHaveTextContent('5');

    await clickButtons(getByRole, ['3', '=']);
    expect(getByTestId('calculator-display')).toHaveTextContent('15');
  });

  it('新计算开始后上一次的表达式被清空', async () => {
    const { getByRole, getByTestId } = render(CalculatorApp);

    await clickButtons(getByRole, ['1', '+', '2', '=']);
    expect(getByTestId('calculator-expression')).toHaveTextContent('1 + 2 =');

    await clickButtons(getByRole, ['3']);
    expect(getByTestId('calculator-expression')).toHaveTextContent('');
    expect(getByTestId('calculator-display')).toHaveTextContent('3');
  });
});
