/**
 * 사전 설치 필요:
 *   npm install llama.rn
 *   npx expo install expo-file-system
 *   cd ios && pod install
 *
 * 모델 파일 URL은 HuggingFace에서 Gemma 4 E2B IT GGUF 확인 후 업데이트:
 *   https://huggingface.co/models?search=gemma-4-e2b-it+GGUF
 */
import * as FileSystem from 'expo-file-system/legacy';
import { initLlama, RNLLAMA_MTMD_DEFAULT_MEDIA_MARKER } from 'llama.rn';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import type { HanddripNote } from '../types';

const MODEL_URL =
  'https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf';
const MMPROJ_URL =
  'https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/mmproj-F16.gguf';

// expo-file-system의 documentDirectory는 'file://' URI를 반환함
// FileSystem API (getInfoAsync, createDownloadResumable)는 URI 사용
// initLlama / initMultimodal / media_paths는 순수 POSIX 경로 필요
const DOC_DIR_URI = FileSystem.documentDirectory ?? 'file:///';
const DOC_DIR_PATH = DOC_DIR_URI.replace(/^file:\/\//, '');

const MODELS_DIR_URI = DOC_DIR_URI + 'llm_models/';
const MODEL_URI = MODELS_DIR_URI + 'gemma-4-E2B-it-Q4_K_M.gguf';
const MMPROJ_URI = MODELS_DIR_URI + 'mmproj-F16.gguf';

const MODEL_PATH = DOC_DIR_PATH + 'llm_models/gemma-4-E2B-it-Q4_K_M.gguf';
const MMPROJ_PATH = DOC_DIR_PATH + 'llm_models/mmproj-F16.gguf';

export type ModelState = 'not_downloaded' | 'downloading' | 'loading' | 'ready' | 'error';

type LlamaContext = Awaited<ReturnType<typeof initLlama>>;

let context: LlamaContext | null = null;
let state: ModelState = 'not_downloaded';
let stateListeners: Array<(s: ModelState) => void> = [];

function setState(s: ModelState) {
  state = s;
  stateListeners.forEach((fn) => fn(s));
}

export function getModelState(): ModelState {
  return state;
}

export function onModelStateChange(fn: (s: ModelState) => void): () => void {
  stateListeners.push(fn);
  return () => {
    stateListeners = stateListeners.filter((l) => l !== fn);
  };
}

export async function isModelDownloaded(): Promise<boolean> {
  try {
    const [m, p] = await Promise.all([
      FileSystem.getInfoAsync(MODEL_URI),
      FileSystem.getInfoAsync(MMPROJ_URI),
    ]);
    return m.exists && p.exists;
  } catch {
    return false;
  }
}

export async function downloadModel(onProgress: (pct: number) => void): Promise<boolean> {
  try {
    setState('downloading');
    await FileSystem.makeDirectoryAsync(MODELS_DIR_URI, { intermediates: true });

    // 다운로드 헬퍼: offset + weight 로 전체 진행률 계산
    const download = (url: string, dest: string, weight: number, offset: number) =>
      new Promise<void>((resolve, reject) => {
        const task = FileSystem.createDownloadResumable(url, dest, {}, (dp) => {
          const ratio =
            dp.totalBytesExpectedToWrite > 0
              ? dp.totalBytesWritten / dp.totalBytesExpectedToWrite
              : 0;
          onProgress(Math.round((offset + ratio * weight) * 100));
        });
        task
          .downloadAsync()
          .then(() => resolve())
          .catch(reject);
      });

    // 메인 모델 ~3GB (85%), mmproj ~950MB (15%)
    await download(MODEL_URL, MODEL_URI, 0.85, 0);
    await download(MMPROJ_URL, MMPROJ_URI, 0.15, 0.85);

    onProgress(100);
    return true;
  } catch (e) {
    console.error('downloadModel error:', e);
    setState('error');
    return false;
  }
}

export async function loadModel(): Promise<boolean> {
  if (context) return true;
  try {
    setState('loading');

    const [mInfo, pInfo] = await Promise.all([
      FileSystem.getInfoAsync(MODEL_URI),
      FileSystem.getInfoAsync(MMPROJ_URI),
    ]);
    console.log('[LLM] model:', JSON.stringify(mInfo));
    console.log('[LLM] mmproj:', JSON.stringify(pInfo));

    context = await initLlama({
      model: MODEL_PATH,
      n_ctx: 2048,
      n_gpu_layers: 0, // 우선 CPU로 테스트, 동작 확인 후 99로 변경
    });
    console.log('[LLM] initLlama OK');

    await context.initMultimodal({
      path: MMPROJ_PATH,
      use_gpu: false,
      image_max_tokens: 256,
    });
    console.log('[LLM] initMultimodal OK');

    setState('ready');
    return true;
  } catch (e) {
    console.error('loadModel error:', e);
    setState('error');
    context = null;
    return false;
  }
}

// 앱 종료 시 또는 메모리 부족 시 호출
export async function releaseModel() {
  if (context) {
    await context.releaseMultimodal();
    await context.release();
    context = null;
    setState('not_downloaded');
  }
}

async function extractOCRText(uris: string[]): Promise<string> {
  const results = await Promise.all(
    uris.map(async (uri, i) => {
      try {
        const result = await TextRecognition.recognize(uri);
        const text = result.text.trim();
        return text ? `[카드 ${i + 1}]\n${text}` : '';
      } catch (e) {
        console.warn('[OCR] 실패:', e);
        return '';
      }
    }),
  );
  return results.filter(Boolean).join('\n\n');
}

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

export async function analyzeCardImages(uris: string[]): Promise<Partial<HanddripNote> | null> {
  if (!context) {
    const ok = await loadModel();
    if (!ok) return null;
  }

  try {
    const ocrText = await extractOCRText(uris);
    console.log('[OCR] 추출 텍스트:', ocrText);

    // media_paths는 file:// 접두사 없는 순수 파일시스템 경로를 요구함
    const filePaths = uris.map((uri) => uri.replace(/^file:\/\//, ''));
    const mediaMarkers = filePaths.map(() => RNLLAMA_MTMD_DEFAULT_MEDIA_MARKER).join('\n');

    const ocrSection = ocrText
      ? `아래는 카드 이미지에서 OCR로 추출한 텍스트입니다. 이 텍스트를 우선 참고하여 필드를 채우세요:\n\`\`\`\n${ocrText}\n\`\`\`\n\n`
      : '';

    const prompt = `<start_of_turn>user\n${mediaMarkers}\n${ocrSection}${PROMPT}<end_of_turn>\n<start_of_turn>model\n`;

    const result = await context!.completion({
      prompt,
      media_paths: filePaths,
      n_predict: 1024,
      temperature: 0.1,
      stop: ['<end_of_turn>', '</s>'],
    });

    const raw = result.text.trim();
    console.log('[LLM] raw output:', raw);

    // 마크다운 코드블록 제거
    const stripped = raw
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```/g, '')
      .trim();

    // 배열로 반환한 경우 첫 번째 객체 사용, 단일 객체면 그대로 사용
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

    // trailing comma 정규화
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
