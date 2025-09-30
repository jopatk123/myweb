import { describe, it, expect, vi, afterEach } from 'vitest';
import { gameUtils } from '@/components/multiplayer/gameUtils.js';
import {
  GAME_TYPE_CONFIGS,
  DEFAULT_GAME_MODES,
} from '@/components/multiplayer/gameTypeConfigs.js';

const ORIGINAL_RANDOM = Math.random;

afterEach(() => {
  Math.random = ORIGINAL_RANDOM;
});

describe('gameUtils', () => {
  it('returns predefined game config when available', () => {
    const config = gameUtils.getGameConfig('snake');
    expect(config).toEqual(GAME_TYPE_CONFIGS.snake);
  });

  it('falls back to a generic config for unknown game type', () => {
    const config = gameUtils.getGameConfig('unknown');
    expect(config.name).toBe('unknown');
    expect(config.defaultModes).toEqual(['competitive']);
  });

  it('converts mode array to lookup map', () => {
    const modeMap = gameUtils.getModeConfig(DEFAULT_GAME_MODES);
    expect(modeMap.competitive.label).toBe('竞技模式');
  });

  it('filters available modes based on game type defaults', () => {
    const modes = gameUtils.getAvailableModes('snake', DEFAULT_GAME_MODES);
    expect(modes.map(mode => mode.value)).toEqual(['shared', 'competitive']);
  });

  it('generates deterministic player color per id and scheme', () => {
    const color1 = gameUtils.generatePlayerColor('player-1');
    const color2 = gameUtils.generatePlayerColor('player-1');
    expect(color1).toBe(color2);
  });

  it('formats room code by uppercasing and stripping invalid characters', () => {
    const formatted = gameUtils.formatRoomCode('ab-12#');
    expect(formatted).toBe('AB12');
  });

  it('validates room code boundaries', () => {
    expect(gameUtils.validateRoomCode('a').isValid).toBe(false);
    expect(gameUtils.validateRoomCode('ABCD').isValid).toBe(true);
  });

  it('validates player name according to options', () => {
    const result = gameUtils.validatePlayerName('  Alice  ', {
      minLength: 2,
      maxLength: 10,
      allowEmoji: false,
      forbiddenWords: ['bot'],
    });
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('Alice');

    const invalid = gameUtils.validatePlayerName('bot123', {
      forbiddenWords: ['bot'],
    });
    expect(invalid.isValid).toBe(false);
  });

  it('returns localized status text with fallback', () => {
    expect(gameUtils.getStatusText('waiting', 'en')).toBe('Waiting');
    expect(gameUtils.getStatusText('unknown', 'fr')).toBe('unknown');
  });

  it('formats duration with hours, minutes and seconds', () => {
    expect(gameUtils.formatDuration(45_000)).toBe('45秒');
    expect(gameUtils.formatDuration(125_000)).toBe('2:05');
    expect(gameUtils.formatDuration(3_660_000)).toBe('1:01:00');
  });

  it('generates room name using deterministic random sequence', () => {
    Math.random = vi.fn()
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.2);
    const name = gameUtils.generateRoomName('snake');
    expect(name).toContain(GAME_TYPE_CONFIGS.snake.name);
  });

  it('checks feature support according to game definition', () => {
    expect(gameUtils.isFeatureSupported('snake', 'chat')).toBe(true);
    expect(gameUtils.isFeatureSupported('snake', 'timer')).toBe(false);
  });

  it('provides recommended settings per game type', () => {
    const snake = gameUtils.getRecommendedSettings('snake', 'shared', 5);
    expect(snake.boardSize).toBe(25);
    expect(snake.gameSpeed).toBe('slow');

    const gomoku = gameUtils.getRecommendedSettings('gomoku', 'competitive', 2);
    expect(gomoku.boardSize).toBe(15);
    expect(gomoku.timeLimit).toBe(300);

    const other = gameUtils.getRecommendedSettings('unknown', 'competitive', 4);
    expect(other.timeLimit).toBeNull();
  });
});
