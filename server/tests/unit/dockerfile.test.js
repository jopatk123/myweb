import fs from 'fs';
import path from 'path';

describe('Dockerfile regression', () => {
  test('runtime image copies shared directory into container', async () => {
    const dockerfilePath = path.resolve(process.cwd(), '..', 'Dockerfile');
    const dockerfileContent = await fs.promises.readFile(
      dockerfilePath,
      'utf-8'
    );

    expect(dockerfileContent).toContain('FROM node:20-alpine AS runtime');
    expect(dockerfileContent).toContain('COPY shared/ ./shared/');
  });
});
