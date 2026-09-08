# Coffee Note AI Proxy

Cloudflare Worker에서 Gemini 카드 분석을 실행합니다. 이미지는 저장하지 않고 요청 중에만 Gemini로 전달합니다.

## 로컬 실행

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

`.dev.vars`에 실제 `GEMINI_API_KEY`를 입력합니다. 이 파일은 Git에서 제외됩니다.

Expo 앱의 로컬 환경 변수에는 Worker 주소만 설정합니다.

```bash
EXPO_PUBLIC_ANALYSIS_API_URL=http://localhost:8787
```

실기기에서 테스트할 때는 `localhost` 대신 개발 컴퓨터의 LAN 주소를 사용합니다.

## 배포

```bash
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

배포 결과로 출력된 Worker URL을 앱의 `EXPO_PUBLIC_ANALYSIS_API_URL`에 지정하고 앱을 다시 빌드합니다.

## 분석 동작과 제한

- Node.js 22 이상을 사용합니다. 서버 테스트는 이 디렉터리에서 `npm test`, 앱 분석 테스트는 프로젝트 루트에서 `node --test scripts/analysis.test.cjs`로 실행합니다.
- 앱은 사진을 긴 변 최대 1600px, JPEG 품질 0.8로 변환합니다. 용량 초과 시 1200px/0.7로 다시 압축합니다.
- 앱 요청 제한은 70초입니다. Gemini 호출은 응답 본문까지 25초이며 명시적인 429/일부 5xx 응답만 한 번 재시도합니다. 시간 초과와 연결 오류는 중복 과금을 줄이기 위해 자동 재시도하지 않습니다.
- 동일 이미지의 동시 요청은 카드별 Durable Object에서 합칩니다. 성공 결과는 메모리에 10분간 캐시하며, 재분석 버튼은 캐시를 건너뜁니다. 객체 재시작 시 캐시는 사라집니다. 이미지와 분석 결과는 영구 저장하지 않습니다.
- `ANALYSIS_DAILY_LIMIT`은 전체 Gemini 호출 시도 한도(기본 500), `ANALYSIS_IP_DAILY_LIMIT`은 IP별 시도 한도(기본 20)입니다. 실패·재시도도 포함하고 캐시 조회는 제외합니다. UTC 자정에 초기화되며 사용량 카운터만 SQLite Durable Object에 저장합니다.
- IP 제한은 사용자 인증이 아닙니다. 같은 네트워크 사용자는 한도를 공유합니다. 공개 서비스 규모에 맞게 한도를 조정하고 계정 도입 시 사용자별 제한으로 확장해야 합니다.
- 로그에는 요청 ID, 오류 코드, 이미지 크기, 처리 시간, Gemini 토큰 사용량을 기록합니다. 사진·분석 내용·API 키는 기록하지 않습니다.
- 모델은 `GEMINI_MODEL`로 설정하며 현재 모델의 thinking을 low로, 출력 한도를 2048토큰으로 설정했습니다. 글자 판독을 위해 이미지 media resolution은 high를 유지합니다.

서버 변경은 Worker 배포가 필요하고 앱 변경은 개발 앱 새로고침 또는 새 앱 배포가 필요합니다. 최초 배포에서 `v1` Durable Object 마이그레이션이 적용됩니다.
