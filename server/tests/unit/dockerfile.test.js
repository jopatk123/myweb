import fs from 'fs';
import path from 'path';

describe('Dockerfile regression', () => {
  test('runtime image copies shared directory into container', async () => {
    const dockerfilePath = path.resolve(process.cwd(), '..', 'Dockerfile');
    const dockerfileContent = await fs.promises.readFile(
      dockerfilePath,
      'utf-8'
    );

    // Node >= 22：better-sqlite3 v13 的 prebuild 仅支持 Node >= 22
    expect(dockerfileContent).toContain('FROM node:22-alpine AS runtime');
    expect(dockerfileContent).toContain('COPY shared/ ./shared/');
  });
});
