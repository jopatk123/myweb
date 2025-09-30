import { describe, it, expect } from 'vitest';
import {
  GAME_MODES,
  THEMES,
  COMPONENT_PRESETS,
} from '@/components/multiplayer/index.js';

describe('multiplayer public API', () => {
  it('exposes game mode constants', () => {
    expect(Object.values(GAME_MODES)).toContain('shared');
  });

  it('provides theme definitions', () => {
    expect(THEMES.light.colors.primary).toBe('#007bff');
  });

  it('includes full preset with settings toggle', () => {
    expect(COMPONENT_PRESETS.full.showSettings).toBe(true);
  });
});
