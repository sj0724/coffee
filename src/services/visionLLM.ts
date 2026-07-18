import * as FileSystem from 'expo-file-system/legacy';
import type { HanddripNote } from '../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const GENERATION_SEED = 42;
const ANALYSIS_VERSION = 'v2';

type MenuAnalysis = {
  is_drink: boolean;
  is_coffee: boolean;
  menu_name: string | null;
};

const menuAnalysisCache = new Map<string, MenuAnalysis>();
const cardAnalysisCache = new Map<string, Partial<HanddripNote>>();

const NULLABLE_STRING_SCHEMA = { type: ['string', 'null'] } as const;

const MENU_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    is_drink: { type: 'boolean' },
    is_coffee: { type: 'boolean' },
    menu_name: NULLABLE_STRING_SCHEMA,
  },
  required: ['is_drink', 'is_coffee', 'menu_name'],
} as const;

const BEAN_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    origin: NULLABLE_STRING_SCHEMA,
    farm: NULLABLE_STRING_SCHEMA,
    variety: NULLABLE_STRING_SCHEMA,
    process_raw: NULLABLE_STRING_SCHEMA,
    ratio: { type: ['number', 'null'] },
  },
  required: ['origin', 'farm', 'variety', 'process_raw', 'ratio'],
} as const;

const CARD_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    is_blend: { type: 'integer', enum: [0, 1] },
    origin: NULLABLE_STRING_SCHEMA,
    farm: NULLABLE_STRING_SCHEMA,
    variety: NULLABLE_STRING_SCHEMA,
    process_raw: NULLABLE_STRING_SCHEMA,
    roast_level_raw: NULLABLE_STRING_SCHEMA,
    official_notes: {
      type: 'array',
      items: { type: 'string' },
    },
    beans: {
      type: 'array',
      items: BEAN_RESPONSE_SCHEMA,
    },
  },
  required: [
    'is_blend',
    'origin',
    'farm',
    'variety',
    'process_raw',
    'roast_level_raw',
    'official_notes',
    'beans',
  ],
} as const;

const PROMPT = `
여러 장의 이미지는 동일한 커피 원두 카드의 앞면/뒷면일 수 있습니다.
모든 이미지 정보를 종합하여 하나의 JSON 객체만 반환하세요.

규칙:
- JSON만 출력
- 코드블록 금지
- 설명 금지
- 추측 금지
- 정보가 없으면 null 사용
- 확인 가능한 정보만 추출
- 영어/한국어 모두 읽기

번역 규칙:
- official_notes: 영어면 한국어로 번역 (예: "Jasmine" → "자스민", "Peach" → "복숭아")
- process_raw: 영어면 한국어로 번역 (예: "Washed" → "워시드", "Natural" → "내추럴", "Honey" → "허니")
- roast_level_raw: 영어면 한국어로 번역 (예: "Light Roast" → "라이트 로스팅", "Medium" → "미디엄")
- origin, variety: 커피 업계에서 통용되는 한국어 표기로 변환 (예: "Ethiopia" → "에티오피아", "Colombia" → "콜롬비아", "Geisha" → "게이샤", "Yirgacheffe" → "예가체프")
- farm: 농장명은 원문 그대로 유지 (예: "Finca El Paraiso" → "Finca El Paraiso")

중요 — 블렌드 판단 기준:
- 한 원두의 국가명/지역명/농장명/품종명이 여럿 적혀 있어도 싱글 오리진입니다.
- 예) "Colombia Piendamo Cauca Geisha" → 싱글 오리진 (is_blend=0)
- 블렌드는 서로 다른 나라 또는 완전히 다른 원두 이름이 "+" 또는 "/" 또는 별도 줄로 나열된 경우만 해당합니다.
- 확신할 수 없으면 is_blend=0으로 처리하세요.

절대 규칙:
- is_blend가 0이면 beans는 []
- is_blend가 1이면 origin, farm, variety, process_raw는 null이고 beans에 각 원두 정보를 분리
- beans의 ratio는 카드에 비율이 명시된 경우에만 숫자로 기록하고, 없으면 null
- official_notes는 중복을 제거하고 카드에 실제로 적힌 향미만 기록

출력 형식:
{
  "is_blend": 0,
  "origin": null,
  "farm": null,
  "variety": null,
  "process_raw": null,
  "roast_level_raw": null,
  "official_notes": [],
  "beans": []
}
`;

function extractLastJSON(text: string): Record<string, unknown> | null {
  // 뒤에서부터 스캔해 마지막으로 완성된 { } 블록을 찾아 파싱
  let depth = 0;
  let end = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '}') {
      if (depth === 0) end = i;
      depth++;
    } else if (text[i] === '{') {
      depth--;
      if (depth === 0 && end !== -1) {
        const candidate = text.slice(i, end + 1).replace(/,\s*([\]}])/g, '$1');
        try {
          return JSON.parse(candidate) as Record<string, unknown>;
        } catch {
          end = -1; // 다음 블록 시도
        }
      }
    }
  }
  return null;
}

async function imageToBase64(uri: string): Promise<{ data: string; mimeType: string }> {
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

function parseStructuredJSON(text: string): Record<string, unknown> | null {
  const stripped = text
    .replace(/```(?:json)?\s*/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    const parsed: unknown = JSON.parse(stripped);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // 구조화 출력이 아닌 예외 응답에 대한 하위 호환 안전망
    return extractLastJSON(stripped);
  }
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function hashBase64(value: string): string {
  // 캐시 키 용도: 원본 base64 전체를 Map 키로 보관하지 않기 위한 간단한 FNV-1a 해시
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}:${(hash >>> 0).toString(16)}`;
}

function cloneCardAnalysis(result: Partial<HanddripNote>): Partial<HanddripNote> {
  return {
    ...result,
    official_notes: result.official_notes ? [...result.official_notes] : [],
    beans: result.beans?.map((bean) => ({ ...bean })) ?? [],
  };
}

const MENU_PROMPT = `
이 이미지에 카페 음료가 포함되어 있는지 확인하세요.

규칙:
- JSON만 출력
- 코드블록 금지
- 설명 금지

is_coffee 판단 기준:
- true: 에스프레소, 아메리카노, 라떼, 카푸치노, 콜드브루, 드립커피 등 커피 베이스 음료
- false: 차, 에이드, 스무디, 쉐이크, 주스, 코코아 등 커피가 아닌 음료

음료가 보이면:
{"is_drink": true, "is_coffee": "커피 베이스 여부", "menu_name": "구체적인 음료명(한국어)"}

음료가 없으면:
{"is_drink": false, "is_coffee": false, "menu_name": null}
`;

export async function analyzeMenuPhoto(uri: string): Promise<MenuAnalysis | null> {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === '여기에_키_입력') return null;

    const img = await imageToBase64(uri);
    const cacheKey = `${ANALYSIS_VERSION}:menu:${hashBase64(img.data)}`;
    const cached = menuAnalysisCache.get(cacheKey);
    if (cached) return { ...cached };

    const parts = [
      { inlineData: { data: img.data, mimeType: img.mimeType } },
      { text: MENU_PROMPT },
    ];

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          seed: GENERATION_SEED,
          candidateCount: 1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseJsonSchema: MENU_RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Gemini Menu] API 오류:', response.status, errText);
      return null;
    }

    const json = await response.json();
    const candidate = json.candidates?.[0];
    console.log('[Gemini Menu] finishReason:', candidate?.finishReason);
    const raw: string = candidate?.content?.parts?.[0]?.text ?? '';
    console.log('[Gemini Menu] raw:', JSON.stringify(raw));

    const p = parseStructuredJSON(raw);
    console.log('[Gemini Menu] parsed:', JSON.stringify(p));

    if (!p) return null;

    const isDrink = p.is_drink === true;
    const result: MenuAnalysis = {
      is_drink: isDrink,
      is_coffee: isDrink && p.is_coffee === true,
      menu_name: isDrink ? (optionalString(p.menu_name) ?? null) : null,
    };
    menuAnalysisCache.set(cacheKey, result);
    return { ...result };
  } catch (e) {
    console.error('[Gemini Menu] analyzeMenuPhoto error:', e);
    return null;
  }
}

export async function analyzeCardImages(uris: string[]): Promise<Partial<HanddripNote> | null> {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === '여기에_키_입력') {
      console.error('[Gemini] API 키가 설정되지 않았습니다. .env.local을 확인하세요.');
      return null;
    }

    const imageParts = await Promise.all(uris.map(imageToBase64));
    const cacheKey = `${ANALYSIS_VERSION}:card:${imageParts
      .map((image) => hashBase64(image.data))
      .join('|')}`;
    const cached = cardAnalysisCache.get(cacheKey);
    if (cached) return cloneCardAnalysis(cached);

    const parts = [
      ...imageParts.map((img) => ({
        inlineData: { data: img.data, mimeType: img.mimeType },
      })),
      { text: PROMPT },
    ];

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          seed: GENERATION_SEED,
          candidateCount: 1,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseJsonSchema: CARD_RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Gemini] API 오류:', response.status, err);
      return null;
    }

    const json = await response.json();
    const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('[Gemini] raw output:', raw);

    const p = parseStructuredJSON(raw);
    if (!p) return null;

    const isBlend = p.is_blend === 1 ? 1 : 0;
    const beans =
      isBlend === 1 && Array.isArray(p.beans)
        ? p.beans
            .filter(
              (bean): bean is Record<string, unknown> =>
                bean !== null && typeof bean === 'object' && !Array.isArray(bean),
            )
            .map((bean) => ({
              origin: optionalString(bean.origin),
              farm: optionalString(bean.farm),
              variety: optionalString(bean.variety),
              process: optionalString(bean.process_raw),
              ratio:
                typeof bean.ratio === 'number' && Number.isFinite(bean.ratio)
                  ? bean.ratio
                  : undefined,
            }))
        : [];

    const officialNotes = Array.isArray(p.official_notes)
      ? Array.from(
          new Set(p.official_notes.map(optionalString).filter((note) => note !== undefined)),
        )
      : [];

    const result: Partial<HanddripNote> = {
      is_blend: isBlend,
      origin: isBlend === 0 ? optionalString(p.origin) : undefined,
      farm: isBlend === 0 ? optionalString(p.farm) : undefined,
      variety: isBlend === 0 ? optionalString(p.variety) : undefined,
      process: isBlend === 0 ? optionalString(p.process_raw) : undefined,
      roast_level: optionalString(p.roast_level_raw),
      official_notes: officialNotes,
      beans,
    };
    cardAnalysisCache.set(cacheKey, result);
    return cloneCardAnalysis(result);
  } catch (e) {
    console.error('analyzeCardImages error:', e);
    return null;
  }
}
