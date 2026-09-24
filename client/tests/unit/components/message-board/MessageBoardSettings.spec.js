import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import MessageBoardSettings from '@/components/message-board/MessageBoardSettings.vue';

const baseSettings = {
  nickname: 'Anonymous',
  avatarColor: '#007bff',
  autoOpenEnabled: false,
};

const renderSettings = (props = {}) =>
  render(MessageBoardSettings, {
    props: {
      modelValue: { ...baseSettings },
      generateRandomColor: vi.fn(() => '#abc123'),
      ...props,
    },
  });

describe('MessageBoardSettings', () => {
  it('renders the current settings into the form controls', () => {
    const { getByLabelText, getByPlaceholderText } = renderSettings();

    expect(getByPlaceholderText('输入昵称')).toHaveValue('Anonymous');
    expect(getByLabelText(/自动打开新消息/)).not.toBeChecked();
  });

  it('emits update:modelValue when the nickname is edited', async () => {
    const { getByPlaceholderText, emitted } = renderSettings();

    await fireEvent.update(getByPlaceholderText('输入昵称'), '小明');

    const payload = emitted('update:modelValue')[0][0];
    expect(payload.nickname).toBe('小明');
    expect(payload.avatarColor).toBe('#007bff');
  });

  it('emits update:modelValue when the auto-open checkbox toggles', async () => {
    const { getByLabelText, emitted } = renderSettings();

    await fireEvent.click(getByLabelText(/自动打开新消息/));

    expect(emitted('update:modelValue')[0][0].autoOpenEnabled).toBe(true);
  });

  it('uses the provided generator for the random color button', async () => {
    const generateRandomColor = vi.fn(() => '#abc123');
    const { getByRole, emitted } = renderSettings({ generateRandomColor });

    await fireEvent.click(getByRole('button', { name: '🎲' }));

    expect(generateRandomColor).toHaveBeenCalledTimes(1);
    expect(emitted('update:modelValue')[0][0].avatarColor).toBe('#abc123');
  });

  it('emits save / cancel / request-clear from the action buttons', async () => {
    const { getByRole, emitted } = renderSettings();

    await fireEvent.click(getByRole('button', { name: '保存' }));
    await fireEvent.click(getByRole('button', { name: '取消' }));
    await fireEvent.click(getByRole('button', { name: '🗑️ 清除留言板' }));

    expect(emitted().save).toHaveLength(1);
    expect(emitted().cancel).toHaveLength(1);
    expect(emitted()['request-clear']).toHaveLength(1);
  });

  it('syncs the local copy when the parent pushes a new modelValue', async () => {
    const { getByPlaceholderText, rerender, emitted } = renderSettings();

    await rerender({
      modelValue: { ...baseSettings, nickname: '远端改名' },
    });

    expect(getByPlaceholderText('输入昵称')).toHaveValue('远端改名');
    // 仅父级主动更新时不应反向 emit，避免回环
    expect(emitted('update:modelValue')).toBeFalsy();
  });

  it('keeps local edits when the prop round-trips with the same value', async () => {
    const { getByPlaceholderText, emitted } = renderSettings();
    await fireEvent.update(getByPlaceholderText('输入昵称'), '同值回环');
    const firstPayload = emitted('update:modelValue')[0][0];

    // 父组件把 emit 的值原样传回（模拟 v-model 回环），不应再次 emit
    await fireEvent.update(getByPlaceholderText('输入昵称'), '同值回环');

    expect(firstPayload.nickname).toBe('同值回环');
  });
});
