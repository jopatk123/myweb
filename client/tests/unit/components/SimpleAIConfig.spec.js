import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/vue';
import { ref } from 'vue';
import SimpleAIConfig from '@/apps/gomoku/components/SimpleAIConfig.vue';

const mockUseSimpleConfig = vi.fn();

vi.mock('@/apps/gomoku/composables/useSimpleGomokuAIConfig.js', () => ({
  useSimpleGomokuAIConfig: () => mockUseSimpleConfig(),
}));

const createSimpleState = () => {
  const state = {
    gameMode: ref('human_vs_ai'),
    rememberKeys: ref(false),
    config: ref({
      apiUrl: 'https://api.example.com/v1',
      apiKey: 'key',
      modelName: 'model',
      playerName: 'AI',
    }),
    ai1Config: ref({
      apiUrl: 'https://api.example.com/v1',
      apiKey: 'key1',
      modelName: 'model',
      playerName: 'AI1',
    }),
    ai2Config: ref({
      apiUrl: 'https://api.example.com/v1',
      apiKey: 'key2',
      modelName: 'model',
      playerName: 'AI2',
    }),
    testing: ref(false),
    testingAI1: ref(false),
    testingAI2: ref(false),
    testResult: ref(null),
    ai1TestResult: ref(null),
    ai2TestResult: ref(null),
    canTest: ref(true),
    canTestAI1: ref(true),
    canTestAI2: ref(true),
    testSingle: vi.fn(),
    testAI1: vi.fn(),
    testAI2: vi.fn(),
    handlePresetSingle: vi.fn(),
    handlePresetAI1: vi.fn(),
    handlePresetAI2: vi.fn(),
    persist: vi.fn(),
    resetConfigs: vi.fn(),
    loadFromStorage: vi.fn(),
    validateBeforeStart: vi.fn(() => ({ success: true })),
    resetResults: vi.fn(),
  };

  return state;
};

const createStubs = () => ({
  GameModeSelector: {
    props: ['modelValue'],
    template: `
      <label>
        模式
        <select data-testid="mode" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
          <option value="human_vs_ai">人机对战</option>
          <option value="ai_vs_ai">AI 对 AI</option>
        </select>
      </label>
    `,
  },
  HumanVsAISection: {
    emits: ['preset', 'test'],
    template: `<div data-testid="human-section"><button @click="$emit('test')">测试连接</button></div>`,
  },
  AIVsAISection: {
    emits: ['preset-ai1', 'preset-ai2', 'test-ai1', 'test-ai2'],
    template: `<div data-testid="ai-section">AI 对战配置</div>`,
  },
});

let simpleState;

beforeEach(() => {
  simpleState = createSimpleState();
  mockUseSimpleConfig.mockReturnValue(simpleState);
});

describe('SimpleAIConfig', () => {
  it('loads configuration on mount', () => {
    render(SimpleAIConfig, { global: { stubs: createStubs() } });
    expect(simpleState.loadFromStorage).toHaveBeenCalled();
  });

  it('emits start-game and config-saved when validation passes in human mode', async () => {
    const { emitted } = render(SimpleAIConfig, {
      global: { stubs: createStubs() },
    });

    await fireEvent.click(screen.getByText('开始游戏'));

    expect(simpleState.validateBeforeStart).toHaveBeenCalled();
    expect(simpleState.persist).toHaveBeenCalled();

    const events = emitted();
    expect(events['config-saved']).toBeTruthy();
    expect(events['config-saved'][0][0]).toEqual({
      mode: 'human_vs_ai',
      aiConfig: expect.objectContaining({
        apiUrl: 'https://api.example.com/v1',
      }),
    });
    expect(events['start-game']).toBeTruthy();
    expect(events.close).toBeTruthy();
  });

  it('emits AI configs when in ai_vs_ai mode', async () => {
    simpleState.gameMode.value = 'ai_vs_ai';

    const { emitted } = render(SimpleAIConfig, {
      global: { stubs: createStubs() },
    });

    await fireEvent.click(screen.getByText('开始游戏'));

    const events = emitted();
    expect(events['config-saved'][0][0]).toEqual({
      mode: 'ai_vs_ai',
      ai1Config: expect.objectContaining({ playerName: 'AI1' }),
      ai2Config: expect.objectContaining({ playerName: 'AI2' }),
    });
  });

  it('does not emit when validation fails', async () => {
    simpleState.validateBeforeStart.mockReturnValue({
      success: false,
      error: 'invalid',
    });

    const { emitted } = render(SimpleAIConfig, {
      global: { stubs: createStubs() },
    });

    await fireEvent.click(screen.getByText('开始游戏'));

    expect(simpleState.persist).not.toHaveBeenCalled();
    const events = emitted();
    expect(events['config-saved']).toBeUndefined();
    expect(events['start-game']).toBeUndefined();
  });

  it('calls resetConfigs when reset button clicked', async () => {
    render(SimpleAIConfig, { global: { stubs: createStubs() } });

    await fireEvent.click(screen.getByText('重置'));

    expect(simpleState.resetConfigs).toHaveBeenCalled();
  });

  it('resets test results when game mode changes', async () => {
    render(SimpleAIConfig, { global: { stubs: createStubs() } });

    const select = screen.getByTestId('mode');
    await fireEvent.update(select, 'ai_vs_ai');

    expect(simpleState.resetResults).toHaveBeenCalled();
  });
});
