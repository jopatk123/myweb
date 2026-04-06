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
});
