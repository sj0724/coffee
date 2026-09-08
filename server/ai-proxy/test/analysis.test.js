import test from 'node:test';
import assert from 'node:assert/strict';
import { callGemini, parseGeminiResponse, normalizeResult } from '../src/analysis.js';
import { parseImages, readBody } from '../src/worker.js';

const value = { status: 'ok', is_blend: 0, origin: '에티오피아', official_notes: ['자스민', '자스민'], beans: [] };
const payload = (parts = [{ text: JSON.stringify(value) }], finishReason = 'STOP') => ({ candidates: [{ finishReason, content: { parts } }] });
const images = [{ data: 'bW9jaw==', mimeType: 'image/jpeg' }];

test('skips thinking parts and joins final JSON parts', () => {
  const text = JSON.stringify(value);
  assert.deepEqual(parseGeminiResponse(payload([{ thought: true, text: 'not JSON' }, { text: text.slice(0, 18) }, { text: text.slice(18) }])).official_notes, ['자스민']);
});
test('handles output cutoff, unreadable and empty results explicitly', () => {
  assert.throws(() => parseGeminiResponse(payload([], 'MAX_TOKENS')), { code: 'OUTPUT_LIMIT' });
  assert.throws(() => normalizeResult({ ...value, status: 'unreadable' }), { code: 'UNREADABLE_IMAGE' });
  assert.throws(() => normalizeResult({ ...value, origin: null, official_notes: [] }), { code: 'UNREADABLE_IMAGE' });
  assert.throws(() => normalizeResult({ ...value, status: 'different_cards' }), { code: 'DIFFERENT_CARDS' });
});
test('blend normalization clears single origin fields and invalid ratios', () => {
  const result = normalizeResult({ ...value, is_blend: 1, beans: [{ origin: '콜롬비아', ratio: 150 }] });
  assert.equal(result.origin, undefined);
  assert.equal(result.beans[0].ratio, undefined);
});
test('rejects invalid images and oversized body before generation', async () => {
  assert.throws(() => parseImages({ images: [{ data: '!!!', mimeType: 'image/jpeg' }] }), { code: 'INVALID_IMAGES' });
  assert.throws(() => parseImages({ images: [...images, ...images, ...images] }), { code: 'INVALID_IMAGES' });
  assert.throws(() => parseImages({ images: [{ ...images[0], data: 'a'.repeat(4_000_004) }] }), { code: 'IMAGE_TOO_LARGE' });
  const request = new Request('https://test', { method: 'POST', body: '{}', headers: { 'Content-Length': '9000000' } });
  await assert.rejects(readBody(request), { code: 'IMAGE_TOO_LARGE' });
});
test('retries only explicit transient responses once and uses low thinking', async () => {
  let calls = 0;
  let reserved = 0;
  const result = await callGemini({ GEMINI_API_KEY: 'mock' }, images, 'test', async () => { reserved++; }, async (_url, init) => {
    calls++;
    const body = JSON.parse(init.body);
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'low');
    assert.equal(body.generationConfig.candidateCount, undefined);
    return calls === 1 ? new Response('', { status: 503, headers: { 'Retry-After': '0' } }) : Response.json(payload());
  });
  assert.equal(result.origin, '에티오피아');
  assert.equal(calls, 2);
  assert.equal(reserved, 2);
});
test('does not retry configuration errors or uncertain network errors', async () => {
  for (const status of [400, 403, 404, 'network']) {
    let calls = 0;
    await assert.rejects(callGemini({ GEMINI_API_KEY: 'mock' }, images, 'test', async () => {}, async () => {
      calls++;
      if (status === 'network') throw new Error('connection lost');
      return new Response('', { status });
    }));
    assert.equal(calls, 1);
  }
});
test('provider timeout covers the response body and never retries', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  let reading;
  const ready = new Promise((resolve) => { reading = resolve; });
  const task = callGemini({ GEMINI_API_KEY: 'mock' }, images, 'test', async () => {}, async (_url, init) => {
    calls++;
    return { ok: true, json: () => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      reading();
    }) };
  });
  await ready;
  t.mock.timers.tick(25_000);
  await assert.rejects(task, { code: 'PROVIDER_TIMEOUT' });
  assert.equal(calls, 1);
});

test('keeps roastery separate from roast level, including roastery-only cards', () => {
  const card = { status: 'ok', is_blend: 0, official_notes: [], beans: [], roastery: '  ABC Coffee  ', roast_level_raw: null };
  const result = normalizeResult(card);
  assert.equal(result.roastery, 'ABC Coffee');
  assert.equal(result.roast_level, undefined);
  const blend = normalizeResult({ ...card, is_blend: 1, roast_level_raw: '라이트 로스팅' });
  assert.equal(blend.roastery, 'ABC Coffee');
  assert.equal(blend.roast_level, '라이트 로스팅');
});
