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
