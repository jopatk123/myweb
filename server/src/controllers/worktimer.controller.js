import WorkTimerService from '../services/worktimer.service.js';

export class WorkTimerController {
  constructor(db) {
    this.service = new WorkTimerService(db);
  }

  start(req, res, next) {
    try {
      const { sessionId, startTime, targetEndTime } = req.body;
      const startIso = startTime || new Date().toISOString();
      const date = this.service.getLocalDateString(startIso);
      const session = {
        id: sessionId,
        date,
        start_time: startIso,
        last_update: startIso,
        end_time: null,
        duration: 0,
        target_end_time: targetEndTime || null,
        is_active: 1,
      };
      this.service.upsertSession(session);
      const totals = this.service.getTotals();
      res.json({ data: { sessionId, totals } });
    } catch (e) {
      next(e);
    }
  }

  heartbeat(req, res, next) {
    try {
      const { sessionId, incrementMs, lastUpdate } = req.body;
      if (!sessionId)
        return res
          .status(400)
          .json({ code: 400, message: 'missing sessionId' });
      const totals = this.service.incrementSessionDuration(
        sessionId,
        Number(incrementMs || 0),
        lastUpdate || new Date().toISOString()
      );
      if (!totals)
        return res
          .status(404)
          .json({ code: 404, message: 'session not found' });
      res.json({ data: totals });
    } catch (e) {
      next(e);
    }
  }

  stop(req, res, next) {
    try {
      const { sessionId, endTime, finalIncrementMs } = req.body;
      if (!sessionId)
        return res
          .status(400)
          .json({ code: 400, message: 'missing sessionId' });
      if (finalIncrementMs) {
        this.service.incrementSessionDuration(
          sessionId,
          Number(finalIncrementMs),
          endTime || new Date().toISOString()
        );
      }
      const totals = this.service.endSession(
        sessionId,
        endTime || new Date().toISOString()
      );
      res.json({ data: totals });
    } catch (e) {
      next(e);
    }
  }

  stats(req, res, next) {
    try {
      const totals = this.service.getTotals();
      res.json({ data: totals });
    } catch (e) {
      next(e);
    }
  }
}

export default WorkTimerController;
