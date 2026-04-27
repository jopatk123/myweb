import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function read(relativePath) {
  return fs.readFile(path.join(__dirname, '..', relativePath), 'utf8');
}

describe('OpenAPI contract coverage', () => {
  let rootSpec;
  let appsSpec;
  let wallpapersSpec;
  let filesSpec;
  let authSpec;
  let notebookSpec;
  let worktimerSpec;
  let messagesSpec;

  beforeAll(async () => {
    [
      rootSpec,
      appsSpec,
      wallpapersSpec,
      filesSpec,
      authSpec,
      notebookSpec,
      worktimerSpec,
      messagesSpec,
    ] = await Promise.all([
      read('openapi.yaml'),
      read('openapi/paths/apps.yaml'),
      read('openapi/paths/wallpapers.yaml'),
      read('openapi/paths/files.yaml'),
      read('openapi/paths/auth.yaml'),
      read('openapi/paths/notebook.yaml'),
      read('openapi/paths/worktimer.yaml'),
      read('openapi/paths/messages.yaml'),
    ]);
  });

  test('documents the implemented auth, app, wallpaper, file, notebook, work-timer, and message routes', () => {
    const expectedPaths = [
      '/api/auth/verify',
      '/api/auth/status',
      '/api/auth/logout',
      '/api/apps',
      '/api/apps/{id}',
      '/api/apps/{id}/visible',
      '/api/apps/{id}/autostart',
      '/api/apps/bulk/visible',
      '/api/apps/move',
      '/api/apps/icons/upload',
      '/api/apps/groups/all',
      '/api/apps/groups',
      '/api/apps/groups/{id}',
      '/api/wallpapers',
      '/api/wallpapers/active',
      '/api/wallpapers/random',
      '/api/wallpapers/{id}/thumbnail',
      '/api/wallpapers/{id}',
      '/api/wallpapers/move',
      '/api/wallpapers/download',
      '/api/wallpapers/{id}/active',
      '/api/wallpapers/groups/all',
      '/api/wallpapers/groups',
      '/api/wallpapers/groups/{id}',
      '/api/wallpapers/groups/current',
      '/api/wallpapers/groups/{id}/current',
      '/api/files',
      '/api/files/upload',
      '/api/files/{id}',
      '/api/files/{id}/download',
      '/api/notebook',
      '/api/notebook/{id}',
      '/api/work-timer/start',
      '/api/work-timer/heartbeat',
      '/api/work-timer/stop',
      '/api/work-timer/stats',
      '/api/messages',
      '/api/messages/user-settings',
      '/api/messages/upload-image',
      '/api/messages/clear-all',
      '/api/messages/{id}',
    ];

    expectedPaths.forEach(specPath => {
      expect(rootSpec).toContain(`${specPath}:`);
    });
  });

  test('removes stale route aliases from the spec', () => {
    expect(rootSpec).not.toContain('/api/wallpapers/batch-delete:');
  });

  test('documents application session and admin token security requirements', () => {
    expect(rootSpec).toMatch(
      /securitySchemes:[\s\S]*appSession:[\s\S]*name:\s*myweb_auth/
    );
    expect(rootSpec).toMatch(
      /securitySchemes:[\s\S]*adminToken:[\s\S]*name:\s*X-Admin-Token/
    );
    expect(rootSpec).toMatch(/security:\s*- appSession:\s*\[\]/);
    expect(filesSpec).toMatch(
      /security:\s*- appSession:\s*\[\]\s*adminToken:\s*\[\]/
    );
    expect(authSpec).toMatch(/security:\s*\[\]/);
  });

  test('keeps dedicated path files aligned with the route families they describe', () => {
    expect(appsSpec).toContain('visibleById:');
    expect(appsSpec).toContain('autostartById:');
    expect(appsSpec).toContain('bulkVisible:');
    expect(appsSpec).toContain('iconUpload:');
    expect(wallpapersSpec).toContain('thumbnail:');
    expect(wallpapersSpec).toContain('download:');
    expect(wallpapersSpec).toContain('activeById:');
    expect(filesSpec).toContain('list:');
    expect(filesSpec).toContain('byId:');
    expect(filesSpec).toContain('download:');
    expect(notebookSpec).toContain('list:');
    expect(notebookSpec).toContain('byId:');
    expect(worktimerSpec).toContain('start:');
    expect(worktimerSpec).toContain('heartbeat:');
    expect(worktimerSpec).toContain('stop:');
    expect(worktimerSpec).toContain('stats:');
    expect(messagesSpec).toContain('userSettings:');
    expect(messagesSpec).toContain('uploadImage:');
    expect(messagesSpec).toContain('clearAll:');
    expect(messagesSpec).toContain('byId:');
  });
});
