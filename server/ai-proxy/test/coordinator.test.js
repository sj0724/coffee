import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: [new URL('../src/index.js', import.meta.url).pathname],
  bundle: true,
  write: false,
  format: 'esm',
  external: ['cloudflare:workers'],
  platform: 'browser',
});
const script = outputFiles[0].text;
const value = { status: 'ok', is_blend: 0, origin: '에티오피아', official_notes: [], beans: [] };
const requestBody = (data = 'bW9jaw==', force = false) =>
  JSON.stringify({ images: [{ data, mimeType: 'image/jpeg' }], force });

function runtime(limits = {}) {
  let calls = 0;
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          modules: true,
          script,
          compatibilityDate: '2026-08-17',
          bindings: {
            GEMINI_API_KEY: 'mock',
            ANALYSIS_DAILY_LIMIT: '20',
            ANALYSIS_IP_DAILY_LIMIT: '10',
            ...limits,
          },
          durableObjects: {
            ANALYSIS_JOBS: { className: 'CardAnalysisJob', useSQLite: true },
            ANALYSIS_BUDGET: { className: 'AnalysisBudget', useSQLite: true },
          },
          ratelimits: {
            ANALYSIS_RATE_LIMITER: { namespace_id: 'test', simple: { limit: 100, period: 60 } },
          },
          outboundService: async () => {
            calls++;
            await new Promise((resolve) => setTimeout(resolve, 50));
            return Response.json({
              candidates: [
                { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } },
              ],
            });
          },
        },
      ],
    }),
  );
  const send = (body = requestBody(), ip = '192.0.2.1') =>
    mf.dispatchFetch('https://test/v1/analyze-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
      body,
    });
  return { mf, send, calls: () => calls };
}

test('real Worker runtime merges concurrent identical requests and force bypasses cache', async () => {
  const app = runtime();
  try {
    const responses = await Promise.all([app.send(), app.send()]);
    for (const response of responses) assert.equal(response.status, 200, await response.text());
    assert.equal(app.calls(), 1);
    assert.equal((await app.send()).status, 200);
    assert.equal(app.calls(), 1);
    assert.equal((await app.send(requestBody('bW9jaw==', true))).status, 200);
    assert.equal(app.calls(), 2);
  } finally {
    await app.mf.dispose();
  }
});
test('daily global budget is shared across different cards and IPs', async () => {
  const app = runtime({ ANALYSIS_DAILY_LIMIT: '1' });
  try {
    assert.equal((await app.send()).status, 200);
    const response = await app.send(requestBody('b3RoZXI='), '192.0.2.2');
    assert.equal(response.status, 429);
    assert.equal((await response.json()).code, 'DAILY_LIMIT');
    assert.equal(app.calls(), 1);
  } finally {
    await app.mf.dispose();
  }
});
test('daily client budget limits paid retries without preventing cache reads', async () => {
  const app = runtime({ ANALYSIS_IP_DAILY_LIMIT: '1' });
  try {
    assert.equal((await app.send()).status, 200);
    assert.equal((await app.send()).status, 200);
    const response = await app.send(requestBody('bW9jaw==', true));
    assert.equal((await response.json()).code, 'CLIENT_DAILY_LIMIT');
    assert.equal(app.calls(), 1);
  } finally {
    await app.mf.dispose();
  }
});
