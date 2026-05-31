import * as FileSystem from 'expo-file-system/legacy';
import type { HanddripNote } from '../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
- is_blend가 1일 때만 beans 사용

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
  return { data, mimeType: 'image/jpeg' };
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
{"is_drink": true, "is_coffee": true, "menu_name": "음료명(한국어, 예: 아메리카노, 카페라떼, 말차 라떼)"}

음료가 없으면:
{"is_drink": false, "is_coffee": false, "menu_name": null}
`;

export async function analyzeMenuPhoto(
  uri: string,
): Promise<{ is_drink: boolean; is_coffee: boolean; menu_name: string | null } | null> {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === '여기에_키_입력') return null;

    const img = await imageToBase64(uri);
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
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
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

    const p = extractLastJSON(
      raw
        .replace(/```(?:json)?\s*/g, '')
        .replace(/```/g, '')
        .trim(),
    );
    console.log('[Gemini Menu] parsed:', JSON.stringify(p));

    if (!p) return null;

    return {
      is_drink: p.is_drink === true,
      is_coffee: p.is_coffee === true,
      menu_name: typeof p.menu_name === 'string' ? p.menu_name : null,
    };
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
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
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

    const stripped = raw
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```/g, '')
      .trim();

    // 마지막으로 나오는 유효한 JSON 객체 추출 (모델이 추론 과정을 출력할 때를 대비)
    const p = extractLastJSON(stripped);
    if (!p) return null;

    return {
      is_blend: typeof p.is_blend === 'number' ? p.is_blend : 0,
      origin: typeof p.origin === 'string' ? p.origin : undefined,
      farm: typeof p.farm === 'string' ? p.farm : undefined,
      variety: typeof p.variety === 'string' ? p.variety : undefined,
      process: typeof p.process_raw === 'string' ? p.process_raw : undefined,
      roast_level: typeof p.roast_level_raw === 'string' ? p.roast_level_raw : undefined,
      official_notes: Array.isArray(p.official_notes) ? (p.official_notes as string[]) : [],
      beans: Array.isArray(p.beans) ? (p.beans as HanddripNote['beans']) : [],
    };
  } catch (e) {
    console.error('analyzeCardImages error:', e);
    return null;
  }
}
