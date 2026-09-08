import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { HanddripNote } from '../types';

const ANALYSIS_API_URL = process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.replace(/\/$/, '') ?? '';
const ANALYSIS_VERSION = 'v6';
const REQUEST_TIMEOUT_MS = 70_000;
const MAX_IMAGE_EDGE = 1600;
const MAX_BASE64_LENGTH = 4_000_000;
const CACHE_TTL_MS = 10 * 60_000;
const cardAnalysisCache = new Map<string, { result: Partial<HanddripNote>; expiresAt: number }>();
const inFlight = new Map<string, Promise<Partial<HanddripNote>>>();

type ProxyImage = { data: string; mimeType: string };
export type AnalysisOptions = { force?: boolean };

const ERROR_MESSAGES: Record<string, string> = {
  NOT_CONFIGURED: '분석 서버 설정을 확인해주세요.',
  SERVICE_CONFIGURATION: '분석 서비스를 준비 중이에요. 잠시 후 다시 시도해주세요.',
  PROVIDER_CONFIGURATION: '분석 서비스를 준비 중이에요. 잠시 후 다시 시도해주세요.',
  INVALID_IMAGES: '원두 카드 사진을 1~2장 선택해주세요.',
  IMAGE_PROCESSING: '사진을 읽지 못했어요. 사진을 다시 선택해주세요.',
  IMAGE_TOO_LARGE: '사진 용량이 커요. 카드 부분만 잘라 다시 선택해주세요.',
  UNREADABLE_IMAGE:
    '카드 글자를 읽지 못했어요. 밝은 곳에서 글자가 선명하게 나오도록 다시 찍어주세요.',
  DIFFERENT_CARDS: '서로 다른 원두 카드가 선택됐어요. 같은 카드의 앞면과 뒷면을 선택해주세요.',
  NOT_COFFEE_CARD: '원두 정보가 적힌 카드 사진을 선택해주세요.',
  IMAGE_BLOCKED: '이 사진은 분석할 수 없어요. 카드 부분만 다시 촬영해주세요.',
  RATE_LIMITED: '요청이 잠시 몰렸어요. 1분 뒤 다시 시도해주세요.',
  PROVIDER_BUSY: 'AI 서비스가 혼잡해요. 잠시 후 다시 시도해주세요.',
  DAILY_LIMIT: '오늘의 AI 분석 한도에 도달했어요. 직접 입력하거나 내일 다시 이용해주세요.',
  CLIENT_DAILY_LIMIT:
    '오늘 이 네트워크의 분석 한도에 도달했어요. 직접 입력하거나 내일 다시 이용해주세요.',
  PROVIDER_TIMEOUT: '분석 시간이 길어져 중단됐어요. 잠시 후 다시 시도하거나 직접 입력해주세요.',
  REQUEST_TIMEOUT: '서버 응답을 기다리다 중단됐어요. 연결 상태를 확인하고 다시 시도해주세요.',
  NETWORK_ERROR: '분석 서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.',
  INVALID_RESPONSE: '분석 결과를 읽지 못했어요. 다시 시도하거나 직접 입력해주세요.',
  OUTPUT_LIMIT: '카드 정보가 많아 분석이 끝나지 못했어요. 필요한 부분만 잘라 다시 시도해주세요.',
};

export class CardAnalysisError extends Error {
  constructor(
    public code: string,
    public requestId?: string,
  ) {
    super(ERROR_MESSAGES[code] || '분석 서비스를 이용할 수 없어요. 잠시 후 다시 시도해주세요.');
    this.name = 'CardAnalysisError';
  }
}

async function imageToBase64(uri: string): Promise<ProxyImage> {
  try {
    const source = await Image.loadAsync(uri, {
      maxWidth: MAX_IMAGE_EDGE,
      maxHeight: MAX_IMAGE_EDGE,
    });
    const context = ImageManipulator.manipulate(source);
    // Enforce output dimensions even if a platform decoder returns a larger cached image.
    if (source.width > MAX_IMAGE_EDGE || source.height > MAX_IMAGE_EDGE) {
      context.resize(
        source.width >= source.height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE },
      );
    }
    let rendered = await context.renderAsync();
    let result = await rendered.saveAsync({ base64: true, compress: 0.8, format: SaveFormat.JPEG });
    if (result.base64 && result.base64.length > MAX_BASE64_LENGTH) {
      const smaller = ImageManipulator.manipulate(rendered);
      smaller.resize(result.width >= result.height ? { width: 1200 } : { height: 1200 });
      rendered = await smaller.renderAsync();
      result = await rendered.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
    }
    if (!result.base64) throw new CardAnalysisError('IMAGE_PROCESSING');
    if (result.base64.length > MAX_BASE64_LENGTH) throw new CardAnalysisError('IMAGE_TOO_LARGE');
    console.info('[Analysis image]', {
      width: result.width,
      height: result.height,
      bytes: Math.floor((result.base64.length * 3) / 4),
    });
    return { data: result.base64, mimeType: 'image/jpeg' };
  } catch (error) {
    throw error instanceof CardAnalysisError ? error : new CardAnalysisError('IMAGE_PROCESSING');
  }
}

function hashBase64(value: string): string {
  let first = 2166136261;
  let second = 5381;
  for (let i = 0; i < value.length; i++) {
    first = Math.imul(first ^ value.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ value.charCodeAt(i);
  }
  return `${value.length}:${first >>> 0}:${second >>> 0}`;
}

function cloneResult(result: Partial<HanddripNote>): Partial<HanddripNote> {
  return {
    ...result,
    official_notes: [...(result.official_notes ?? [])],
    beans: result.beans?.map((bean) => ({ ...bean })) ?? [],
  };
}

function isResult(value: unknown): value is Partial<HanddripNote> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    (result.is_blend === 0 || result.is_blend === 1) &&
    ['origin', 'farm', 'variety', 'process', 'roast_level', 'roastery'].every(
      (key) => result[key] == null || typeof result[key] === 'string',
    ) &&
    Array.isArray(result.official_notes) &&
    result.official_notes.every((note) => typeof note === 'string') &&
    Array.isArray(result.beans) &&
    result.beans.every(
      (bean) =>
        bean &&
        typeof bean === 'object' &&
        !Array.isArray(bean) &&
        ['origin', 'farm', 'variety', 'process'].every(
          (key) => bean[key] == null || typeof bean[key] === 'string',
        ) &&
        (bean.ratio == null ||
          (typeof bean.ratio === 'number' &&
            Number.isFinite(bean.ratio) &&
            bean.ratio >= 0 &&
            bean.ratio <= 100)),
    )
  );
}

async function analyze(uris: string[], force: boolean): Promise<Partial<HanddripNote>> {
  const images: ProxyImage[] = [];
  // Keep native image buffers sequential to reduce peak memory on older phones.
  for (const uri of uris) images.push(await imageToBase64(uri));
  const cacheKey = `${ANALYSIS_VERSION}:${images
    .map((image) => hashBase64(image.data))
    .sort()
    .join('|')}`;
  const cached = cardAnalysisCache.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now()) return cloneResult(cached.result);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${ANALYSIS_API_URL}/v1/analyze-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, force }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => {
      if (controller.signal.aborted) throw new CardAnalysisError('REQUEST_TIMEOUT');
      return null;
    });
    if (!response.ok)
      throw new CardAnalysisError(
        payload?.code || (response.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE'),
        payload?.requestId,
      );
    if (!isResult(payload?.result))
      throw new CardAnalysisError('INVALID_RESPONSE', payload?.requestId);
    if (cardAnalysisCache.size >= 30)
      cardAnalysisCache.delete(cardAnalysisCache.keys().next().value!);
    cardAnalysisCache.set(cacheKey, {
      result: payload.result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return cloneResult(payload.result);
  } catch (error) {
    const failure =
      error instanceof CardAnalysisError
        ? error
        : new CardAnalysisError(controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR');
    console.warn('[Analysis Proxy]', { code: failure.code, requestId: failure.requestId });
    throw failure;
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeCardImages(
  uris: string[],
  options: AnalysisOptions = {},
): Promise<Partial<HanddripNote>> {
  if (!ANALYSIS_API_URL) throw new CardAnalysisError('NOT_CONFIGURED');
  if (!uris.length || uris.length > 2) throw new CardAnalysisError('INVALID_IMAGES');
  const key = JSON.stringify(uris);
  const pending = inFlight.get(key);
  if (pending) return cloneResult(await pending);
  const task = analyze([...uris], options.force === true);
  inFlight.set(key, task);
  try {
    return cloneResult(await task);
  } finally {
    inFlight.delete(key);
  }
}
