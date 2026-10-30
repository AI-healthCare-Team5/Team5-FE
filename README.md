# 진료한장

## M1 화면 구현 상태

현재는 API 없이 화면을 확인하는 단계입니다. 카카오 로그인 버튼은 예시 로그인 상태로 전환하며 실제 인증·마이크·위치 권한·지도 SDK·병원 API를 호출하지 않습니다. 진료과와 병원 지도는 가짜 데이터와 예시 표시입니다. 문진·로그인·기록 데이터는 메모리에만 유지되며 새로고침하면 초기화됩니다. 글자 크기만 로컬 저장소에 저장합니다.

문진은 답변이 없는 상태에서 시작합니다. 응급 안내에는 실제 사용할 수 있는 119 전화만 표시하고, 미구현 응급실·응급 카드 이동은 숨깁니다. 병원 오류의 검색 재시도·요약지 버튼은 대상 화면 연결 전까지 비활성 상태입니다. 요약지 로딩은 스피너를 표시하며 완료 신호 없이 다른 화면으로 이동하지 않습니다. 로그인 화면은 기존 공식 버튼 이미지로 표시하되 실제 소셜 인증은 수행하지 않습니다.

- 시작: `/`, 마이크 안내: `/mic-guide`, 사용 불가: `/mic-guide/unavailable`
- 7문항 문진: `/interview`, 위치 안내: `/location`
- 병원 없음: `/hospital-empty`, 병원 오류: `/hospital-error`
- 요약지 로딩: `/summary-loading`, 응급 안내: `/emergency`
- 보호자 동의: `/guardian-consent?from=guardian` 또는 `?from=my-info`
- 로그인: `/login`, 실패: `/login/failed`, 기록 동의: `/record-consent`
- 내 기록: `/records`, 기록 상세: `/records/:id`, 내 계정: `/my-info`

실패·빈 결과·응급 화면은 해당 URL로 직접 검토합니다. 로그인 후 동의하면 예시 기록 3건을 볼 수 있습니다. 문진은 버튼 선택 후 다음 질문으로 이동하며 이전 답변을 유지합니다. 마지막 기록을 지우면 기록 저장 동의도 해제합니다.

### 다른 담당자와 연결할 부분

`/text-input`(#22), `/region`(#33), `/hospitals`(#24), `/summary`(#25), `/emergency-card`(#30), `/guardian`(#31)는 담당 화면이 합쳐질 때 `src/App.tsx`에 추가해야 합니다. 현재 해당 경로는 404로 처리하며 M1 작업에서 임의 화면을 만들지 않았습니다. `/my-info`는 계정 영역만 구현되어 있으므로 #32 본문을 추가해야 합니다. 따라서 전체 문진→병원→요약지 통합 흐름은 아직 완성되지 않았습니다.

- `HospitalMap`: `hospitals: MapHospital[]`, `selectedHospitalId`, `onSelectHospital(id)`로 목록과 선택을 공유합니다. 좌표는 `latitude`, `longitude`이며 SDK 교체 전 예시 지도입니다.
- `SummaryDocument`: `summary: SummaryData`를 받아 9개 항목을 읽기 전용으로 표시합니다. #25에서 동일한 타입을 사용하고 편집 UI는 별도로 연결합니다.
- `SummaryStorage`: `loggedIn`, `saved`, `onLogin`, `onSave`를 전달합니다. 저장이 확인된 경우에만 `saved=true`를 전달합니다. 로그인 전 `appActions.prepareLogin("/summary")`를 호출하면 동의 후 복귀합니다.
- `AccountCard`: `loggedIn`, `nickname`, `recordConsent`, `recordCount`, `onLogout`, `onWithdraw`를 전달합니다.
- 상태: `useAppStore()`와 `appActions.answer(key, value)`를 사용합니다. `Interview`와 `SummaryData`는 프론트 화면용 타입이며 백엔드 응답 계약이 아닙니다.

### 공통 UI 사용 예시

```tsx
import {
  ActionLink,
  Button,
  Card,
  Chip,
  Notice,
  Progress,
} from "@/components/ui";

<Card>
  <Notice tone="amber">정책 확정 전 안내</Notice>
  <Progress current={1} total={7} />
  <Chip selected={selected} onClick={() => setSelected(!selected)}>
    선택지
  </Chip>
  <Button disabled={!selected} onClick={handleNext}>
    다음
  </Button>
  <ActionLink to="/" variant="outline">
    처음으로
  </ActionLink>
</Card>;
```

레이아웃은 `AppShell`이 제공하므로 페이지 안에서 `main`을 중복 작성하지 않습니다. 고정 119 바를 숨겨야 하는 경로는 `AppShell`의 집합에 등록합니다. 공통 버튼은 `primary`, `outline`, `quiet`, `emergency` 변형을 지원합니다. 글자·여백은 rem, 아이콘·터치 영역 최소값·119 바는 px로 관리합니다.

카카오 버튼 출처: [공식 리소스](https://developers.kakao.com/tool/resource/login). PWA 아이콘은 저장소의 SVG 원본에서 PNG로 내보낸 파일이며 manifest에는 192/512 및 maskable 변형을 등록했습니다. 서비스 워커와 오프라인 캐시는 추가하지 않았습니다. iOS 홈 화면 설치·실기기 검증은 별도로 필요합니다.

이슈별 브랜치는 선행 브랜치를 기반으로 순서대로 쌓여 있습니다. PR의 base는 바로 앞 선행 브랜치로 지정하여 변경을 분리합니다. 병합은 공통 기반부터 진행하고, 선행 PR 병합 후 다음 PR base를 main으로 변경합니다. 부분 구현과 연동 보류 이슈는 `Refs`로 연결하며 자동 종료하지 않습니다. `docs/`는 로컬 참고 자료이므로 커밋·push하지 않습니다.

Vite, React, TypeScript, Tailwind CSS를 사용하는 프론트엔드 프로젝트입니다.

## 개발 환경

- Node.js 22.12 이상 (`.nvmrc` 참고)
- npm 10.9 이상

## 시작하기

1. 의존성을 설치합니다: `npm ci`
2. 개발 서버를 실행합니다: `npm run dev`

Windows PowerShell에서 npm.ps1 실행 정책 오류가 나면 `npm.cmd ci`, `npm.cmd run dev`처럼 npm.cmd로 실행할 수 있습니다.

환경 변수가 필요하면 `.env.example`을 `.env.local`로 복사해 값을 채웁니다.

백엔드 API를 호출하려면 `.env.local`에 `API_ORIGIN`(예: `API_ORIGIN=http://localhost:8080`)을 설정합니다. 값이 없으면 `npm run dev`는 `http://localhost:8080`으로 `/api` 요청을 프록시합니다.

## 주요 명령

- `npm run dev`: 로컬 개발 서버
- `npm run format`: Prettier로 포맷 적용 (`format:check`는 확인만)
- `npm run lint`: ESLint 검사
- `npm run typecheck`: TypeScript 검사 (앱 코드, worker, vite.config.ts)
- `npm run test`: Vitest 테스트 (`test:watch`는 감시 모드)
- `npm run build`: 프로덕션 빌드
- `npm run preview`: 프로덕션 빌드 미리보기
- `npm run preview:worker`: 빌드 후 `wrangler dev`로 Worker 런타임에서 실행 (`/api` 프록시 포함)

## 폴더 구성

- `src/App.tsx`: 라우트 정의 (react-router)
- `src/api`: API 공통 요청 함수, 응답·오류 타입, enum
- `src/components`: 여러 화면에서 공유하는 컴포넌트
- `src/pages`: 화면별 컴포넌트
- `src/styles`: 글꼴, 기본 스타일, 디자인 토큰, 공통 유틸리티
- `public`: favicon 등 정적 파일
- `worker`: Cloudflare Worker 진입점 (`/api/*` 프록시)
- `.github`: 이슈 및 PR 템플릿과 CI 워크플로
- `.kiro/steering`: Kiro 전용 보조 지침

`src` 내부 파일은 `@/components/Button`처럼 `@/` 별칭으로 import합니다.

프로젝트의 개발 규칙은 루트 AGENTS.md에 있습니다. Claude Code는 CLAUDE.md를 통해 같은 지침을 읽고, Kiro도 루트 AGENTS.md를 자동으로 읽습니다.

## AI 에이전트 설정

공용 설정은 저장소에 커밋하고, 개인 설정은 커밋하지 않습니다.

| 구분 | 위치                                             | 내용                                                         |
| ---- | ------------------------------------------------ | ------------------------------------------------------------ |
| 공용 | `AGENTS.md`, `CLAUDE.md`, `.kiro/steering/`      | 팀 공통 지침                                                 |
| 공용 | `.claude/settings.json`                          | 허용 명령, `.env` 읽기 차단, 파일 수정 후 Prettier 자동 실행 |
| 공용 | `.claude/skills/issue-to-pr/`                    | 이슈에서 PR까지 협업 절차                                    |
| 개인 | `.claude/settings.local.json`, `CLAUDE.local.md` | 이 저장소에서만 쓰는 개인 설정 (gitignore)                   |
| 개인 | `~/.claude/`, `~/.kiro/`                         | 모든 프로젝트에 적용되는 개인 설정                           |

공용 설정을 바꾸려면 PR로 팀과 합의합니다. 개인 취향(응답 언어, 추가 허용 명령 등)은 개인 설정 파일에 둡니다.

## GitHub Actions와 Cloudflare Workers

GitHub Actions는 main 브랜치 push와 PR에서 format, lint, typecheck, test, build를 실행합니다. 의존성은 `package-lock.json` 기준으로 `npm ci`로 설치합니다.

배포는 Cloudflare Workers Builds의 Git 연동으로 관리합니다. 저장소를 Worker에 연결하고 빌드 명령은 `npm run build`, 배포 명령은 `npx wrangler deploy`로 설정합니다. 프로덕션이 아닌 브랜치의 배포 명령은 기본값 `npx wrangler versions upload`를 그대로 두며, 브랜치와 PR마다 미리보기 URL이 생성됩니다. 빌드 환경 변수에 `NODE_VERSION=22.12`를 지정해 로컬 및 CI와 Node 버전을 맞춥니다. `VITE_` 변수는 빌드 시점에 번들에 들어가므로 빌드 변수에 등록합니다. Worker 설정은 `wrangler.jsonc`에 있습니다.

React SPA의 경로 fallback은 `wrangler.jsonc`의 `assets.not_found_handling: "single-page-application"` 설정으로 처리됩니다. 일치하는 정적 파일이 없는 경로에는 `index.html`을 응답하므로 `/visits/1` 같은 경로를 새로고침해도 react-router가 화면을 그립니다. 이 동작이 깨지므로 `public/404.html`은 추가하지 않습니다.

### `/api` 프록시

`/api/*` 요청은 `assets.run_worker_first` 설정으로 SPA fallback 대상에서 제외되고, `worker/index.ts`가 먼저 받아 `API_ORIGIN` 백엔드로 경로와 쿼리를 그대로 전달합니다. 백엔드 응답은 프론트엔드와 같은 출처에서 반환되므로 Safari에서도 인증 쿠키가 같은 사이트 쿠키로 저장됩니다.

- 배포: Cloudflare 대시보드의 Worker 설정 > Variables and Secrets에 `API_ORIGIN`(예: `https://api.example.com`, 경로 없이 출처만)을 런타임 변수로 등록합니다. `wrangler.jsonc`의 `keep_vars: true` 덕분에 `wrangler deploy`가 이 값을 지우지 않습니다. 값이 없거나 백엔드에 연결할 수 없으면 `/api/*`는 502 JSON을 응답합니다.
- 로컬: `.env.local`에 `API_ORIGIN`을 설정합니다. `npm run dev`는 Vite 프록시로, `npm run preview:worker`는 `wrangler dev`가 같은 `.env.local`을 읽어 전달합니다. `.dev.vars` 파일을 만들면 `wrangler dev`는 `.env.local` 대신 그 파일만 읽습니다. Safari는 로컬 http에서 `Secure` 쿠키를 저장하지 않을 수 있으므로 로컬 로그인 확인은 Chrome이나 Firefox로 합니다.
- 백엔드 쿠키는 `Domain` 속성 없이 `Path=/`, `Secure`, `HttpOnly`로 설정해야 합니다(백엔드 측 작업).
