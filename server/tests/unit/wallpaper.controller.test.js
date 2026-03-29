import { jest } from '@jest/globals';
import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';
import { WallpaperController } from '../../src/controllers/wallpaper.controller.js';

describe('WallpaperController unit branches', () => {
  let db;
  let controller;
  let req;
  let res;
  let next;

  beforeAll(async () => {
    db = await createTestDatabase();
    controller = new WallpaperController(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    req = { body: {}, query: {}, params: {}, headers: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    next = jest.fn();
    jest.restoreAllMocks();
  });

  test('getWallpapers passes paged args when page and limit exist', async () => {
    jest
      .spyOn(controller.service, 'getAllWallpapers')
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 1 });

    req.query = { groupId: '2', page: '1', limit: '1' };
    await controller.getWallpapers(req, res, next);

    expect(controller.service.getAllWallpapers).toHaveBeenCalledWith('2', 1, 1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200 })
    );
  });

  test('getWallpapers calls next when service throws', async () => {
    jest
      .spyOn(controller.service, 'getAllWallpapers')
      .mockRejectedValueOnce(new Error('get all failed'));

    await controller.getWallpapers(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('uploadWallpaper returns 400 when file is missing', async () => {
    await controller.uploadWallpaper(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '请选择文件' })
    );
  });

  test('uploadWallpaper calls next when service throws', async () => {
    req.file = {
      filename: 'a.jpg',
      originalname: 'a.jpg',
      size: 10,
      mimetype: 'image/jpeg',
    };
    jest
      .spyOn(controller.service, 'uploadWallpaper')
      .mockRejectedValueOnce(new Error('upload failed'));

    await controller.uploadWallpaper(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('deleteWallpapers returns 400 when sanitized ids are empty', async () => {
    req.body = { ids: ['x', -1, 0] };

    await controller.deleteWallpapers(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    );
  });

  test('deleteWallpapers calls next when service throws', async () => {
    req.body = { ids: [1, 2] };
    jest
      .spyOn(controller.service, 'deleteMultipleWallpapers')
      .mockRejectedValueOnce(new Error('delete many failed'));

    await controller.deleteWallpapers(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('moveWallpapers returns 400 when groupId is missing', async () => {
    req.body = { ids: [1] };

    await controller.moveWallpapers(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    );
  });

  test('moveWallpapers returns 400 when sanitized ids are empty', async () => {
    req.body = { ids: ['x'], groupId: 1 };

    await controller.moveWallpapers(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    );
  });

  test('moveWallpapers converts groupId to number', async () => {
    req.body = { ids: [1], groupId: '7' };
    jest
      .spyOn(controller.service, 'moveMultipleWallpapers')
      .mockResolvedValueOnce({});

    await controller.moveWallpapers(req, res, next);

    expect(controller.service.moveMultipleWallpapers).toHaveBeenCalledWith(
      [1],
      7
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200 })
    );
  });

  test('moveWallpapers calls next when service throws', async () => {
    req.body = { ids: [1], groupId: 3 };
    jest
      .spyOn(controller.service, 'moveMultipleWallpapers')
      .mockRejectedValueOnce(new Error('move failed'));

    await controller.moveWallpapers(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('setActiveWallpaper calls next when service throws', async () => {
    req.params = { id: '1' };
    jest
      .spyOn(controller.service, 'setActiveWallpaper')
      .mockRejectedValueOnce(new Error('set active failed'));

    await controller.setActiveWallpaper(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getActiveWallpaper calls next when service throws', async () => {
    jest
      .spyOn(controller.service, 'getActiveWallpaper')
      .mockRejectedValueOnce(new Error('active failed'));

    await controller.getActiveWallpaper(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getRandomWallpaper returns empty message when service returns null', async () => {
    jest
      .spyOn(controller.service, 'getRandomWallpaper')
      .mockResolvedValueOnce(null);

    await controller.getRandomWallpaper(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '该分组暂无壁纸' })
    );
  });

  test('group methods call next when service throws', async () => {
    jest
      .spyOn(controller.service, 'getAllGroups')
      .mockRejectedValueOnce(new Error('groups failed'));
    await controller.getGroups(req, res, next);

    jest
      .spyOn(controller.service, 'createGroup')
      .mockRejectedValueOnce(new Error('create group failed'));
    await controller.createGroup(req, res, next);

    req.params = { id: '2' };
    jest
      .spyOn(controller.service, 'updateGroup')
      .mockRejectedValueOnce(new Error('update group failed'));
    await controller.updateGroup(req, res, next);

    jest
      .spyOn(controller.service, 'deleteGroup')
      .mockRejectedValueOnce(new Error('delete group failed'));
    await controller.deleteGroup(req, res, next);

    jest
      .spyOn(controller.service, 'getCurrentGroup')
      .mockRejectedValueOnce(new Error('current group failed'));
    await controller.getCurrentGroup(req, res, next);

    jest
      .spyOn(controller.service, 'setCurrentGroup')
      .mockRejectedValueOnce(new Error('set current failed'));
    await controller.setCurrentGroup(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('downloadWallpapers returns 400 for sanitized empty ids', async () => {
    req.body = { ids: ['x'] };

    await controller.downloadWallpapers(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    );
  });

  test('downloadWallpapers returns 400 for invalid single file path', async () => {
    req.body = { ids: [1] };
    jest.spyOn(controller.service, 'getWallpapersByIds').mockResolvedValueOnce([
      {
        id: 1,
        file_path: '/etc/passwd',
        original_name: 'bad.jpg',
        mime_type: 'image/jpeg',
      },
    ]);

    await controller.downloadWallpapers(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    );
  });

  test('downloadWallpapers returns 404 when single file does not exist', async () => {
    req.body = { ids: [1] };
    jest.spyOn(controller.service, 'getWallpapersByIds').mockResolvedValueOnce([
      {
        id: 1,
        file_path: 'uploads/wallpapers/not-exists-unit.jpg',
        original_name: 'missing.jpg',
        mime_type: 'image/jpeg',
      },
    ]);

    await controller.downloadWallpapers(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 404 })
    );
  });

  test('downloadWallpapers calls next when service throws', async () => {
    req.body = { ids: [1] };
    jest
      .spyOn(controller.service, 'getWallpapersByIds')
      .mockRejectedValueOnce(new Error('download failed'));

    await controller.downloadWallpapers(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
