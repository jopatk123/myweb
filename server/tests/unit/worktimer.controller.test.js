import { jest } from '@jest/globals';
import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';
import { WorkTimerController } from '../../src/controllers/worktimer.controller.js';

describe('WorkTimerController', () => {
  let db;
  let controller;
  let req;
  let res;
  let next;

  beforeAll(async () => {
    db = await createTestDatabase();
    controller = new WorkTimerController(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM work_sessions').run();

    req = { body: {}, query: {}, params: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('start()', () => {
    test('creates session and returns sessionId with totals', () => {
      req.body = { sessionId: 'sess-1', startTime: new Date().toISOString() };
      controller.start(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sessionId: 'sess-1' }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('uses current time when startTime is not provided', () => {
      req.body = { sessionId: 'sess-auto-time' };
      controller.start(req, res, next);
      expect(res.json).toHaveBeenCalled();
    });

    test('passes targetEndTime to session', () => {
      req.body = {
        sessionId: 'sess-target',
        targetEndTime: new Date(Date.now() + 3600000).toISOString(),
      };
      controller.start(req, res, next);
      expect(res.json).toHaveBeenCalled();
    });

    test('calls next on service error', () => {
      jest.spyOn(controller.service, 'upsertSession').mockImplementation(() => {
        throw new Error('DB error');
      });
      req.body = { sessionId: 'err-sess' };
      controller.start(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('heartbeat()', () => {
    test('returns 400 when sessionId is missing', () => {
      req.body = { incrementMs: 1000 };
      controller.heartbeat(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 400 })
      );
    });

    test('returns 404 when session not found', () => {
      req.body = { sessionId: 'non-existent', incrementMs: 1000 };
      controller.heartbeat(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('increments session and returns totals', () => {
      // First create a session
      const startTime = new Date().toISOString();
      controller.service.upsertSession({
        id: 'hb-sess',
        date: controller.service.getLocalDateString(startTime),
        start_time: startTime,
        last_update: startTime,
        end_time: null,
        duration: 0,
        target_end_time: null,
        is_active: 1,
      });

      req.body = { sessionId: 'hb-sess', incrementMs: 5000 };
      controller.heartbeat(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.anything() })
      );
    });

    test('calls next on unexpected error', () => {
      jest
        .spyOn(controller.service, 'incrementSessionDuration')
        .mockImplementation(() => {
          throw new Error('unexpected');
        });
      req.body = { sessionId: 'some-sess', incrementMs: 1000 };
      controller.heartbeat(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('stop()', () => {
    test('returns 400 when sessionId is missing', () => {
      req.body = {};
      controller.stop(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('stops session and returns totals', () => {
      const startTime = new Date().toISOString();
      controller.service.upsertSession({
        id: 'stop-sess',
        date: controller.service.getLocalDateString(startTime),
        start_time: startTime,
        last_update: startTime,
        end_time: null,
        duration: 0,
        target_end_time: null,
        is_active: 1,
      });

      req.body = { sessionId: 'stop-sess', endTime: new Date().toISOString() };
      controller.stop(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.anything() })
      );
    });

    test('applies finalIncrementMs before stopping', () => {
      const startTime = new Date().toISOString();
      controller.service.upsertSession({
        id: 'fin-inc-sess',
        date: controller.service.getLocalDateString(startTime),
        start_time: startTime,
        last_update: startTime,
        end_time: null,
        duration: 1000,
        target_end_time: null,
        is_active: 1,
      });

      req.body = {
        sessionId: 'fin-inc-sess',
        finalIncrementMs: 3000,
        endTime: new Date().toISOString(),
      };
      controller.stop(req, res, next);
      expect(res.json).toHaveBeenCalled();
    });

    test('calls next on unexpected error', () => {
      jest.spyOn(controller.service, 'endSession').mockImplementation(() => {
        throw new Error('end error');
      });
      req.body = { sessionId: 'err-stop' };
      controller.stop(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('stats()', () => {
    test('returns totals', () => {
      controller.stats(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.anything() })
      );
    });

    test('calls next on unexpected error', () => {
      jest.spyOn(controller.service, 'getTotals').mockImplementation(() => {
        throw new Error('stats error');
      });
      controller.stats(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
