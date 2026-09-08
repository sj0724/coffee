import { ANALYSIS_VERSION, AnalysisError } from './analysis.js';

const MAX_BASE64_LENGTH = 4_000_000;
const MAX_BODY_BYTES = MAX_BASE64_LENGTH * 2 + 2048;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      ...(status === 429 ? { 'Retry-After': '60' } : {}),
    },
  });
}

export async function readBody(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES)
    throw new AnalysisError('IMAGE_TOO_LARGE', 413);
  if (!request.body) throw new AnalysisError('INVALID_IMAGES', 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AnalysisError('IMAGE_TOO_LARGE', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    throw new AnalysisError('INVALID_IMAGES', 400);
  } finally {
    reader.releaseLock();
  }
}

export function parseImages(body) {
  if (!Array.isArray(body?.images) || !body.images.length || body.images.length > 2)
    throw new AnalysisError('INVALID_IMAGES', 400);
  return body.images.map((image) => {
    if (!MIME_TYPES.has(image?.mimeType) || typeof image.data !== 'string' || !image.data.length)
      throw new AnalysisError('INVALID_IMAGES', 400);
    if (image.data.length > MAX_BASE64_LENGTH) throw new AnalysisError('IMAGE_TOO_LARGE', 413);
    if (
      image.data.length % 4 !== 0 ||
      /[^A-Za-z0-9+/=]/.test(image.data) ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
    )
      throw new AnalysisError('INVALID_IMAGES', 400);
    return { data: image.data, mimeType: image.mimeType };
  });
}

async function digest(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
    if (request.method === 'GET' && url.pathname === '/health')
      return json({ ok: true, version: ANALYSIS_VERSION });
    if (request.method !== 'POST' || url.pathname !== '/v1/analyze-card')
      return json({ error: 'Not found' }, 404);
    const requestId = crypto.randomUUID();
    try {
      if (
        !env.GEMINI_API_KEY ||
        !env.ANALYSIS_JOBS ||
        !env.ANALYSIS_BUDGET ||
        !env.ANALYSIS_RATE_LIMITER
      )
        throw new AnalysisError('SERVICE_CONFIGURATION', 503);
      const clientIp = request.headers.get('CF-Connecting-IP') || 'local';
      const limit = await env.ANALYSIS_RATE_LIMITER.limit({ key: clientIp });
      if (!limit.success) throw new AnalysisError('RATE_LIMITED', 429);
      const body = await readBody(request);
      const images = parseImages(body);
      const hashes = await Promise.all(
        images.map((image) => digest(`${image.mimeType}:${image.data}`)),
      );
      const key = await digest(
        `${ANALYSIS_VERSION}:${env.GEMINI_MODEL}:${hashes.sort().join(':')}`,
      );
      const clientHash = await digest(`${new Date().toISOString().slice(0, 10)}:${clientIp}`);
      const response = await env.ANALYSIS_JOBS.getByName(key).analyze({
        images,
        clientHash,
        requestId,
        force: body.force === true,
      });
      return response.status === 200
        ? json({ result: response.result, requestId, cached: response.cached })
        : json({ error: 'Analysis failed', code: response.code, requestId }, response.status);
    } catch (error) {
      const failure =
        error instanceof AnalysisError ? error : new AnalysisError('SERVICE_UNAVAILABLE', 503);
      console.warn(
        JSON.stringify({ event: 'analysis_request_failed', requestId, code: failure.code }),
      );
      return json({ error: 'Analysis failed', code: failure.code, requestId }, failure.status);
    }
  },
};
