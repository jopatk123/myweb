import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/vue';
import { ref, reactive, computed } from 'vue';
import AIConfigPanel from '@/apps/gomoku/components/AIConfigPanel.vue';

const mockUseAIConfigPanel = vi.fn();

vi.mock('@/apps/gomoku/composables/useAIConfigPanel.js', () => ({
  useAIConfigPanel: () => mockUseAIConfigPanel(),
}));

const createPanelState = () => {
  const modeRef = ref('human_vs_ai');
  const playersRef = ref([2]);
  const playerConfigs = reactive({
    1: { apiUrl: '', apiKey: '' },
    2: { apiUrl: '', apiKey: '' },
  });
  const testResults = reactive({});
  const validationError = ref('');

  const state = {
    presetConfigs: [],
    selectedMode: modeRef,
    configurablePlayers: computed(() => playersRef.value),
    playerConfigs,
    testResults,
    validationError,
    isTestingConnection: ref(false),
    getPlayerTitle: vi.fn(playerNumber => `玩家${playerNumber}`),
    handleModeChange: vi.fn(mode => {
      modeRef.value = mode;
      playersRef.value = mode === 'human_vs_ai' ? [2] : [1, 2];
    }),
    applyPreset: vi.fn(),
    savePlayerConfig: vi.fn(),
    testConnection: vi.fn(),
    prepareAndValidateGame: vi.fn(() => ({ success: true })),
    resetAll: vi.fn(),
    loadFromStorage: vi.fn(),
    setValidationError: vi.fn(message => {
      validationError.value = message;
    }),
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
  AIPlayerConfigForm: {
    props: ['playerNumber'],
    template: `<div data-testid="player-form">配置表单 {{ playerNumber }}</div>`,
  },
  AIConfigPanelActions: {
    emits: ['start', 'reset'],
    template: `
      <div>
        <button @click="$emit('start')">开始游戏</button>
        <button @click="$emit('reset')">重置配置</button>
      </div>
    `,
  },
  AIConfigValidationAlert: {
    props: ['message'],
    template: `<div data-testid="validation">{{ message }}</div>`,
  },
});

let panelState;

beforeEach(() => {
  panelState = createPanelState();
  mockUseAIConfigPanel.mockReturnValue(panelState);
});

describe('AIConfigPanel', () => {
  it('loads configuration on mount', () => {
    render(AIConfigPanel, { global: { stubs: createStubs() } });
    expect(panelState.loadFromStorage).toHaveBeenCalled();
  });

  it('emits start-game when validation passes', async () => {
    const { emitted } = render(AIConfigPanel, {
      global: { stubs: createStubs() },
    });

    const startButton = screen.getByText('开始游戏');
    await fireEvent.click(startButton);

    expect(panelState.prepareAndValidateGame).toHaveBeenCalled();
    const events = emitted();
    expect(events['start-game']).toBeTruthy();
    expect(events.close).toBeTruthy();
  });

  it('shows validation error when validation fails', async () => {
    panelState.prepareAndValidateGame.mockReturnValue({
      success: false,
      error: '配置错误',
    });

    render(AIConfigPanel, { global: { stubs: createStubs() } });

    const startButton = screen.getByText('开始游戏');
    await fireEvent.click(startButton);

    expect(panelState.setValidationError).toHaveBeenCalledWith('配置错误');
    expect(screen.getByTestId('validation').textContent).toBe('配置错误');
  });

  it('calls resetAll when reset button clicked', async () => {
    render(AIConfigPanel, { global: { stubs: createStubs() } });

    await fireEvent.click(screen.getByText('重置配置'));

    expect(panelState.resetAll).toHaveBeenCalled();
  });

  it('handles game mode change', async () => {
    render(AIConfigPanel, { global: { stubs: createStubs() } });

    const select = screen.getByTestId('mode');
    await fireEvent.update(select, 'ai_vs_ai');

    expect(panelState.handleModeChange).toHaveBeenCalledWith('ai_vs_ai');
    expect(panelState.selectedMode.value).toBe('ai_vs_ai');
  });
});
