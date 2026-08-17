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
