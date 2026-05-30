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
  "variety": null,
  "process_raw": null,
  "roast_level_raw": null,
  "official_notes": [],
  "beans": []
}
`;

async function imageToBase64(uri: string): Promise<{ data: string; mimeType: string }> {
  const data = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { data, mimeType: 'image/jpeg' };
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
          maxOutputTokens: 1024,
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

    const objMatch = stripped.match(/\{[\s\S]*\}/);
    const arrMatch = stripped.match(/\[[\s\S]*\]/);
    let jsonStr: string | null = null;
    if (objMatch) {
      jsonStr = objMatch[0];
    } else if (arrMatch) {
      const arr = JSON.parse(arrMatch[0]);
      jsonStr = JSON.stringify(Array.isArray(arr) && arr.length > 0 ? arr[0] : arr);
    }
    if (!jsonStr) return null;

    const cleaned = jsonStr.replace(/,\s*([\]}])/g, '$1');
    const p = JSON.parse(cleaned) as Record<string, unknown>;

    return {
      is_blend: typeof p.is_blend === 'number' ? p.is_blend : 0,
      origin: typeof p.origin === 'string' ? p.origin : undefined,
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
