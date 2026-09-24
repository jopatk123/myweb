import { describe, expect, it } from 'vitest';
import router from '@/router/index.js';

const expectedRoutes = [
  { path: '/', name: 'Home' },
  { path: '/wallpapers', name: 'WallpaperManagement' },
  { path: '/apps', name: 'AppManagement' },
  { path: '/files', name: 'FileManagement' },
];

describe('router', () => {
  it('registers the expected route table', () => {
    const routeMap = new Map(
      router.getRoutes().map(route => [route.path, route.name])
    );

    expect(routeMap.size).toBe(expectedRoutes.length);
    for (const { path, name } of expectedRoutes) {
      expect(routeMap.get(path)).toBe(name);
    }
  });

  it('declares lazy-loaded components as dynamic import functions', () => {
    for (const route of router.getRoutes()) {
      expect(typeof route.components.default).toBe('function');
    }
  });

  it('lazy loaders resolve to real view modules', async () => {
    for (const route of router.getRoutes()) {
      const mod = await route.components.default();
      expect(mod.default).toBeDefined();
    }
  });

  it('resolves each path to its route name without loading components', () => {
    for (const { path, name } of expectedRoutes) {
      expect(router.resolve(path).name).toBe(name);
    }
  });

  it('leaves unknown paths unmatched', () => {
    const match = router.resolve('/definitely/not/registered');

    expect(match.name).toBeUndefined();
    expect(match.matched).toHaveLength(0);
  });

  it('uses HTML5 history bound to the current document location', () => {
    expect(router.options.history).toBeDefined();
    expect(typeof router.options.history.location).toBe('string');
    expect(router.options.history.location).toBe('/');
  });
});
