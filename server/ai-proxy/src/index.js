const MAX_IMAGES = 2;
const MAX_BASE64_LENGTH = 14_000_000;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const NULLABLE_STRING_SCHEMA = { type: ['string', 'null'] };
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
};
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
    official_notes: { type: 'array', items: { type: 'string' } },
    beans: { type: 'array', items: BEAN_RESPONSE_SCHEMA },
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
};

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

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}

function optionalString(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseImages(body) {
  if (!body || !Array.isArray(body.images)) return null;
  if (body.images.length === 0 || body.images.length > MAX_IMAGES) return null;

  const images = [];
  for (const image of body.images) {
    if (!image || typeof image.data !== 'string' || typeof image.mimeType !== 'string') return null;
    if (!ALLOWED_MIME_TYPES.has(image.mimeType)) return null;
    if (image.data.length === 0 || image.data.length > MAX_BASE64_LENGTH) return null;
    images.push({ data: image.data, mimeType: image.mimeType });
  }
  return images;
}

function normalizeResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const isBlend = value.is_blend === 1 ? 1 : 0;
  const beans =
    isBlend === 1 && Array.isArray(value.beans)
      ? value.beans
          .filter((bean) => bean && typeof bean === 'object' && !Array.isArray(bean))
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
  const officialNotes = Array.isArray(value.official_notes)
    ? [...new Set(value.official_notes.map(optionalString).filter(Boolean))]
    : [];

  return {
    is_blend: isBlend,
    origin: isBlend === 0 ? optionalString(value.origin) : undefined,
    farm: isBlend === 0 ? optionalString(value.farm) : undefined,
    variety: isBlend === 0 ? optionalString(value.variety) : undefined,
    process: isBlend === 0 ? optionalString(value.process_raw) : undefined,
    roast_level: optionalString(value.roast_level_raw),
    official_notes: officialNotes,
    beans,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(env, images) {
  const model = env.GEMINI_MODEL || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          ...images.map((image) => ({
            inlineData: image,
            mediaResolution: { level: 'media_resolution_high' },
          })),
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      seed: 42,
      candidateCount: 1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseJsonSchema: CARD_RESPONSE_SCHEMA,
    },
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) return response;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
    } finally {
      clearTimeout(timeoutId);
    }
    await wait(1000 * 2 ** (attempt - 1));
  }
  throw new Error('Gemini request failed');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
    }
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true });
    if (request.method !== 'POST' || url.pathname !== '/v1/analyze-card') {
      return json({ error: 'Not found' }, 404);
    }

    const clientKey = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await env.ANALYSIS_RATE_LIMITER.limit({ key: clientKey });
    if (!rateLimit.success) return json({ error: 'Too many requests' }, 429);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const images = parseImages(body);
    if (!images) return json({ error: 'Invalid images' }, 400);

    try {
      const response = await callGemini(env, images);
      if (!response.ok) {
        console.error('Gemini error', response.status);
        return json({ error: 'Analysis failed' }, response.status === 429 ? 429 : 502);
      }
      const payload = await response.json();
      const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof raw !== 'string') return json({ error: 'Invalid AI response' }, 502);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return json({ error: 'Invalid AI response' }, 502);
      }
      const result = normalizeResult(parsed);
      if (!result) return json({ error: 'Invalid AI response' }, 502);
      return json({ result });
    } catch (error) {
      console.error('Analysis error', error instanceof Error ? error.message : String(error));
      return json({ error: 'Analysis unavailable' }, 503);
    }
  },
};
