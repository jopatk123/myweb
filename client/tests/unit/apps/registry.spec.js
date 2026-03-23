import { describe, expect, it } from 'vitest';
import {
  internalApps,
  getAppComponentBySlug,
  getAppMetaBySlug,
} from '@/apps/registry.js';
import { BUILTIN_APP_DEFINITIONS } from '@shared/builtin-apps.js';

describe('builtin app registry', () => {
  it('keeps registry metadata aligned with shared builtin definitions', () => {
    expect(internalApps.map(app => app.slug)).toEqual(
      BUILTIN_APP_DEFINITIONS.map(app => app.slug)
    );

    for (const builtin of BUILTIN_APP_DEFINITIONS) {
      expect(getAppComponentBySlug(builtin.slug)).toBeTruthy();
      expect(getAppMetaBySlug(builtin.slug)).toMatchObject({
        slug: builtin.slug,
        name: builtin.name,
        preferredSize: builtin.preferredSize,
      });
    }
  });
});
