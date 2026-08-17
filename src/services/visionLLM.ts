import * as FileSystem from 'expo-file-system/legacy';
import type { HanddripNote } from '../types';

const ANALYSIS_API_URL = process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.replace(/\/$/, '') ?? '';
const ANALYSIS_VERSION = 'v3';
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 45_000;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const cardAnalysisCache = new Map<string, Partial<HanddripNote>>();

type ProxyImage = { data: string; mimeType: string };

async function imageToBase64(uri: string): Promise<ProxyImage> {
  const data = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : extension === 'heic' || extension === 'heif'
          ? `image/${extension}`
          : 'image/jpeg';
  return { data, mimeType };
}

function hashBase64(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}:${(hash >>> 0).toString(16)}`;
}

function cloneResult(result: Partial<HanddripNote>): Partial<HanddripNote> {
  return {
    ...result,
    official_notes: result.official_notes ? [...result.official_notes] : [],
    beans: result.beans?.map((bean) => ({ ...bean })) ?? [],
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestAnalysis(images: ProxyImage[]): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${ANALYSIS_API_URL}/v1/analyze-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
        signal: controller.signal,
      });
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) return response;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw error;
    } finally {
      clearTimeout(timeoutId);
    }
    await wait(1000 * 2 ** (attempt - 1));
  }

  throw lastError;
}

export async function analyzeCardImages(uris: string[]): Promise<Partial<HanddripNote> | null> {
  if (!ANALYSIS_API_URL) {
    console.error('EXPO_PUBLIC_ANALYSIS_API_URL이 설정되지 않았습니다.');
    return null;
  }
  if (uris.length === 0 || uris.length > 2) return null;

  try {
    const images = await Promise.all(uris.map(imageToBase64));
    const cacheKey = `${ANALYSIS_VERSION}:${images.map((image) => hashBase64(image.data)).join('|')}`;
    const cached = cardAnalysisCache.get(cacheKey);
    if (cached) return cloneResult(cached);

    const response = await requestAnalysis(images);
    if (!response.ok) {
      console.error('[Analysis Proxy] API 오류:', response.status, await response.text());
      return null;
    }

    const payload = (await response.json()) as { result?: Partial<HanddripNote> };
    if (!payload.result || typeof payload.result !== 'object') return null;

    cardAnalysisCache.set(cacheKey, payload.result);
    return cloneResult(payload.result);
  } catch (error) {
    console.error('[Analysis Proxy] 요청 실패:', error);
    return null;
  }
}
