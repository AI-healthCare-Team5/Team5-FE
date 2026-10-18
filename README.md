# 진료한장

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
