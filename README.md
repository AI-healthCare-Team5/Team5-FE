# 진료한장

말로 증상을 설명하면 진료과·병원 안내와 의사에게 보여줄 요약지까지 만들어 주는 진료 준비 도우미의 프론트엔드입니다. 진단이 아닌 진료 준비를 돕는 서비스이며, 모바일(390) 레이아웃 하나로 만드는 웹앱입니다. Vite, React, TypeScript, Tailwind CSS를 사용합니다.

## 구현 상태 (2026-11-04 기준)

화면 ID와 경로, 담당 이슈는 [`AGENTS.md`](./AGENTS.md)의 "화면과 경로" 표를 기준으로 합니다.

- 연결된 API: 카카오 로그인(인가 URL 발급, 인가 코드 교환)과 토큰 재발급. `src/api/client.ts`의 공통 요청 함수와 `src/api/auth.ts`를 사용합니다.
- 카카오맵: `VITE_KAKAO_MAP_APP_KEY`가 있으면 SDK 지도를, 없거나 로드에 실패하면 예시 지도를 표시합니다.
- 가짜 데이터: 병원 목록과 진료과(`src/pages/hospitals/sampleHospitals.ts`, API #26)와 예시 기록은 `VITE_API_MOCK=true`일 때만 보여 주고, 실제 경로에서는 준비 중으로 표시합니다. 요약지는 샘플 요약지(`src/pages/summary/sampleSummary.ts`)입니다. 문진·로그인·기록 상태는 메모리에만 있어 새로고침하면 초기화됩니다. 글자 크기는 로컬 저장소, 카카오 로그인 복귀 정보는 sessionStorage에 저장합니다.
- 미연결: 음성 인식(S03은 버튼 문진), 위치 권한, 문진·요약지·기록 API.
- 미구현 경로: `/region`(#33), `/emergency-card`(#30), `/guardian`(#31). 현재는 404로 처리하며, 해당 화면으로 가는 버튼은 화면이 합쳐질 때까지 비활성이거나 숨겨져 있습니다. `/my-info`는 계정 영역만 있어 #32 본문을 추가해야 합니다.

따라서 문진 → 병원 → 요약지 전체 흐름은 아직 끝까지 이어지지 않습니다. 실패·빈 결과·응급 화면은 해당 URL로 직접 검토합니다. 백엔드 없이 로그인 흐름을 보려면 `.env.local`에 `VITE_API_MOCK=true`를 둡니다.

### 다른 담당자와 연결할 부분

- `HospitalMap`: `hospitals: MapHospital[]`, `selectedHospitalId`, `onSelectHospital(id)`로 목록과 선택을 공유합니다. 좌표는 `latitude`, `longitude`입니다.
- `SummaryDocument`: `summary: SummaryData`를 받아 9개 항목을 읽기 전용으로 표시합니다. #25에서 동일한 타입을 사용하고 편집 UI는 별도로 연결합니다. H02 기록 상세도 이 컴포넌트를 씁니다.
- `SummaryStorage`: `loggedIn`, `saved`, `onLogin`, `onSave`를 전달합니다. 저장이 확인된 경우에만 `saved=true`를 전달합니다. 로그인 전 `appActions.prepareLogin("/summary", saveTarget)`을 호출하면 동의 후 복귀합니다.
- `AccountCard`: `loggedIn`, `nickname`, `recordConsent`, `recordCount`, `onLogout`, `onWithdraw`를 전달합니다.
- 상태: `useAppStore()`와 `appActions.answer(key, value)`를 사용합니다. `Interview`와 `SummaryData`는 프론트 화면용 타입이며 백엔드 응답 계약이 아닙니다. 서버 값은 `src/api/enums.ts`의 enum과 `src/api/values.ts`의 표시 함수를 사용합니다.

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

선행 브랜치에 의존하는 작업은 선행 브랜치에서 새 브랜치를 만들고, PR의 base를 바로 앞 선행 브랜치로 지정합니다. 선행 PR이 병합되면 다음 PR의 base를 main으로 바꿉니다. 부분 구현과 연동 보류 이슈는 `Refs`로 연결하며 자동 종료하지 않습니다. `docs/`는 로컬 참고 자료이므로 커밋·push하지 않습니다.

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
- `src/stores`: 앱 상태(`appStore`), 화면용 모델, 카카오 로그인 복귀 처리
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
| 공용 | `.claude/skills/screen-impl/`                    | 화면 구현 순서와 완료 기준, 화면별 디자인 결정(`screens.md`) |
| 공용 | `.agents/skills/`, `.codex/`                     | Codex용 스킬 사본과 Prettier 훅. `.claude/skills`와 맞춥니다 |
| 개인 | `.claude/settings.local.json`, `CLAUDE.local.md` | 이 저장소에서만 쓰는 개인 설정 (gitignore)                   |
| 개인 | `~/.claude/`, `~/.kiro/`                         | 모든 프로젝트에 적용되는 개인 설정                           |

공용 설정을 바꾸려면 PR로 팀과 합의합니다. 개인 취향(응답 언어, 추가 허용 명령 등)은 개인 설정 파일에 둡니다.

## GitHub Actions와 Cloudflare Workers

GitHub Actions는 main 브랜치 push와 PR에서 format, lint, typecheck, test, build를 실행합니다. 의존성은 `package-lock.json` 기준으로 `npm ci`로 설치합니다.

배포는 Cloudflare Workers Builds의 Git 연동으로 관리합니다. 저장소를 Worker에 연결하고 빌드 명령은 `npm run build`, 배포 명령은 `npx wrangler deploy`로 설정합니다. 프로덕션이 아닌 브랜치의 배포 명령은 기본값 `npx wrangler versions upload`를 그대로 두며, 브랜치와 PR마다 미리보기 URL이 생성됩니다. 빌드 환경 변수에 `NODE_VERSION=22.12`를 지정해 로컬 및 CI와 Node 버전을 맞춥니다. `VITE_` 변수는 빌드 시점에 번들에 들어가므로 빌드 변수에 등록합니다. 빌드 변수는 프로덕션과 미리보기 빌드가 함께 쓰므로, 가짜 응답을 켜는 `VITE_API_MOCK`은 등록하지 않고 로컬 `.env.local`에서만 사용합니다. Worker 설정은 `wrangler.jsonc`에 있습니다.

React SPA의 경로 fallback은 `wrangler.jsonc`의 `assets.not_found_handling: "single-page-application"` 설정으로 처리됩니다. 일치하는 정적 파일이 없는 경로에는 `index.html`을 응답하므로 `/visits/1` 같은 경로를 새로고침해도 react-router가 화면을 그립니다. 이 동작이 깨지므로 `public/404.html`은 추가하지 않습니다.

### `/api` 프록시

`/api/*` 요청은 `assets.run_worker_first` 설정으로 SPA fallback 대상에서 제외되고, `worker/index.ts`가 먼저 받아 `API_ORIGIN` 백엔드로 경로와 쿼리를 그대로 전달합니다. 백엔드 응답은 프론트엔드와 같은 출처에서 반환되므로 Safari에서도 인증 쿠키가 같은 사이트 쿠키로 저장됩니다.

- 배포: Cloudflare 대시보드의 Worker 설정 > Variables and Secrets에 `API_ORIGIN`(예: `https://api.example.com`, 경로 없이 출처만)을 런타임 변수로 등록합니다. `wrangler.jsonc`의 `keep_vars: true` 덕분에 `wrangler deploy`가 이 값을 지우지 않습니다. 값이 없거나 백엔드에 연결할 수 없으면 `/api/*`는 502 JSON을 응답합니다.
- 로컬: `.env.local`에 `API_ORIGIN`을 설정합니다. `npm run dev`는 Vite 프록시로, `npm run preview:worker`는 `wrangler dev`가 같은 `.env.local`을 읽어 전달합니다. `.dev.vars` 파일을 만들면 `wrangler dev`는 `.env.local` 대신 그 파일만 읽습니다. Safari는 로컬 http에서 `Secure` 쿠키를 저장하지 않을 수 있으므로 로컬 로그인 확인은 Chrome이나 Firefox로 합니다.
- 백엔드 쿠키는 `Domain` 속성 없이 `Path=/`, `Secure`, `HttpOnly`로 설정해야 합니다(백엔드 측 작업).
