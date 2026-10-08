# JellySafe

제주 해파리 안전 서비스.

pnpm / Turborepo 모노레포로 구성됩니다.

- `apps/public`: 일반 사용자용 모바일 웹앱
- `apps/admin`: 관리자용 데스크톱 대시보드
- `packages/design-system`: 공유 디자인 토큰, 아이콘, UI 프리미티브

## 데모 버전 안내

배포된 사이트는 **포트폴리오용 데모 빌드**입니다. 서버 운영비와 AI 분석 비용 때문에 실제 백엔드 대신 앱에 넣어둔 예시 데이터로 동작합니다.

- 실서비스 버전: [`v1.0-final`](https://github.com/zi0w/FrontEnd/tree/v1.0-final) 태그. Nest.js 백엔드와 연동했습니다(TanStack Query, 관리자 JWT 인증, 익명 토큰 기반 제보·즐겨찾기, AI 이미지 분석 결과 폴링).
- 데모 빌드: 연동 코드는 그대로 두고, 통신 계층(`src/shared/api/http-client.ts`)에서만 `fetch`를 mock으로 바꿉니다. 응답은 백엔드 DTO 형식과 같습니다.
  - 공개 앱: `apps/public/src/shared/api/mock`
  - 관리자 앱: `apps/admin/src/shared/api/mock`
- 데모 모드 켜기: 빌드할 때 `NEXT_PUBLIC_DEMO_MODE=true`를 설정합니다.
- 관리자 데모 계정: `demo@jellysafe.kr` / `demo1234` (로그인 화면에 미리 입력되어 있음)

## Commands

```bash
pnpm dev        # 개발 서버 실행
pnpm lint       # 린트
pnpm typecheck  # 타입 검사
pnpm build      # 빌드
```
