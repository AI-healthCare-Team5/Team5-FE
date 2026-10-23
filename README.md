# 진료한장

## M1 화면 구현 상태

현재는 API 없이 화면을 확인하는 단계입니다. 카카오 로그인 버튼은 예시 로그인 상태로 전환하며 실제 인증·마이크·위치 권한·지도 SDK·병원 API를 호출하지 않습니다. 진료과와 병원 지도는 가짜 데이터와 예시 표시입니다. 문진·로그인·기록 데이터는 메모리에만 유지되며 새로고침하면 초기화됩니다. 글자 크기만 로컬 저장소에 저장합니다.

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

## 주요 명령

- `npm run dev`: 로컬 개발 서버
- `npm run format`: Prettier로 포맷 적용 (`format:check`는 확인만)
- `npm run lint`: ESLint 검사
- `npm run typecheck`: TypeScript 검사 (앱 코드와 vite.config.ts)
- `npm run test`: Vitest 테스트 (`test:watch`는 감시 모드)
- `npm run build`: 프로덕션 빌드
- `npm run preview`: 프로덕션 빌드 미리보기

## 폴더 구성

- `src/App.tsx`: 라우트 정의 (react-router)
- `src/components`: 여러 화면에서 공유하는 컴포넌트
- `src/pages`: 화면별 컴포넌트
- `src/styles`: 글꼴, 기본 스타일, 디자인 토큰, 공통 유틸리티
- `public`: favicon 등 정적 파일
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

## GitHub Actions와 Cloudflare Pages

GitHub Actions는 main 브랜치 push와 PR에서 format, lint, typecheck, test, build를 실행합니다. 의존성은 `package-lock.json` 기준으로 `npm ci`로 설치합니다.

배포는 Cloudflare Pages의 Git 연동으로 관리합니다. GitHub 조직 저장소 접근을 허용한 뒤 저장소를 연결하고, 프레임워크 프리셋은 Vite(또는 None), 빌드 명령은 `npm run build`, 출력 폴더는 `dist`로 설정합니다. 빌드 환경 변수에 `NODE_VERSION=22.12`를 지정해 로컬 및 CI와 Node 버전을 맞춥니다. 기본 브랜치를 프로덕션 브랜치로 지정하면 다른 브랜치와 PR에 Preview 배포가 생성됩니다.

React SPA의 경로 fallback은 Cloudflare Pages 기본 동작으로 처리됩니다. `public/404.html`이 없으면 일치하지 않는 경로에 `index.html`을 응답하므로 `/visits/1` 같은 경로를 새로고침해도 react-router가 화면을 그립니다. 이 동작이 깨지므로 `public/404.html`은 추가하지 않습니다.
