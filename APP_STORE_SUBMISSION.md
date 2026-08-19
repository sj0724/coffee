# App Store 제출 전 직접 입력·확인 항목

## 직접 입력할 값

1. `src/config/legal.ts`의 `LEGAL_OPERATOR_NAME`
2. `LEGAL_DOCUMENTS.md`의 같은 자리
3. 아래 Notion 페이지가 로그인하지 않은 시크릿 브라우저에서도 열리는지 확인

## App Store Connect

- App Privacy > Privacy Policy URL: `https://app.notion.com/p/Coffee-Note-3c1e5bc286528034930cd72a179764d5?source=copy_link`
- 앱 버전 > Support URL: `https://app.notion.com/p/Coffee-Note-3c1e5bc286528038a6b7f3199969b8f1?source=copy_link`
- 서비스 이용약관 URL: `https://app.notion.com/p/Coffee-Note-3c1e5bc286528021b1ddfbc2430721a6?source=copy_link`
- App Privacy 데이터 유형: AI로 전송되는 사진, Kakao 검색어·위치 좌표, Cloudflare가 처리하는 네트워크 정보를 각 공급자 계약과 대조해 신고
- 추적 목적 사용: 현재 코드 기준 없음
- 계정: 현재 회원가입 기능 없음
- 암호화 수출 규정: `ITSAppUsesNonExemptEncryption: false`가 실제 통신 방식과 일치하는지 확인

## 외부 사업자 정책 확인

- 사용 중인 Google Gemini API 플랜의 입력 데이터 보관 및 모델 학습 조건
- Cloudflare Worker 로그와 Rate Limiter에서 IP가 처리·보관되는 기간
- Kakao Local API의 검색어 및 위치정보 처리 조건

확인 결과가 현재 개인정보처리방침 문구와 다르면 문서와 App Privacy 답변을 함께 수정해야 합니다.
