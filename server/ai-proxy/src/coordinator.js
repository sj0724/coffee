import { DurableObject } from 'cloudflare:workers';
import { AnalysisError, callGemini } from './analysis.js';

// A short atomic counter operation, not a global queue for image processing.
export class AnalysisBudget extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS counts (day TEXT, scope TEXT, value INTEGER, PRIMARY KEY(day, scope))',
    );
  }

  reserve(clientHash) {
    const day = new Date().toISOString().slice(0, 10);
    const globalLimit = Number(this.env.ANALYSIS_DAILY_LIMIT || 500);
    const clientLimit = Number(this.env.ANALYSIS_IP_DAILY_LIMIT || 20);
    if (
      !Number.isInteger(globalLimit) ||
      globalLimit < 1 ||
      !Number.isInteger(clientLimit) ||
      clientLimit < 1
    )
      return { allowed: false, code: 'SERVICE_CONFIGURATION' };
    return this.ctx.storage.transactionSync(() => {
      const sql = this.ctx.storage.sql;
      sql.exec('DELETE FROM counts WHERE day <> ?', day);
      const getCount = (scope) =>
        sql.exec('SELECT value FROM counts WHERE day = ? AND scope = ?', day, scope).toArray()[0]
          ?.value || 0;
      if (getCount('global') >= globalLimit) return { allowed: false, code: 'DAILY_LIMIT' };
      if (getCount(clientHash) >= clientLimit)
        return { allowed: false, code: 'CLIENT_DAILY_LIMIT' };
      for (const scope of ['global', clientHash]) {
        sql.exec(
          'INSERT INTO counts(day, scope, value) VALUES (?, ?, 1) ON CONFLICT(day, scope) DO UPDATE SET value = value + 1',
          day,
          scope,
        );
      }
      return { allowed: true };
    });
  }
}

// One object per content hash: unrelated images never block one another.
export class CardAnalysisJob extends DurableObject {
  pending = null;
  cached = null;

  async analyze({ images, clientHash, requestId, force }) {
    if (this.pending) return this.pending;
    if (!force && this.cached && this.cached.expiresAt > Date.now())
      return { ...this.cached.response, cached: true };
    this.pending = this.run(images, clientHash, requestId);
    try {
      const response = await this.pending;
      if (response.status === 200) this.cached = { response, expiresAt: Date.now() + 10 * 60_000 };
      return response;
    } finally {
      this.pending = null;
    }
  }

  async run(images, clientHash, requestId) {
    try {
      const result = await callGemini(this.env, images, requestId, async () => {
        const budget = await this.env.ANALYSIS_BUDGET.getByName('daily').reserve(clientHash);
        if (!budget.allowed) throw new AnalysisError(budget.code, 429);
      });
      return { status: 200, result, cached: false };
    } catch (error) {
      const failure =
        error instanceof AnalysisError ? error : new AnalysisError('SERVICE_UNAVAILABLE', 503);
      console.warn(JSON.stringify({ event: 'analysis_failed', requestId, code: failure.code }));
      return { status: failure.status, code: failure.code };
    }
  }
}
