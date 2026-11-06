# 진료한장 프로젝트 지침

이 파일을 저장소의 기본 개발 지침으로 사용합니다. 작업을 시작하기 전에 관련 지침과 기존 코드를 확인하고, 범위를 벗어나는 기능이나 화면을 임의로 추가하지 않습니다.

## 서비스 기준

- 진료한장은 고령층이 말로 증상을 설명하면 진료과·병원 안내와 의사에게 보여줄 요약지를 만들어 주는 모바일 웹앱입니다.
- 핵심 원칙은 진단이 아닌 진료 준비입니다. 화면 문구와 코드 주석에 병명 추정, 진단, 치료 권유 표현을 쓰지 않습니다.
- 응급 여부는 AI보다 사전에 정한 위험 신호 규칙으로 먼저 판정합니다. 응급 판정 로직은 백엔드가 담당하며, 프론트는 응답에 따라 응급 화면으로 전환합니다.
- 로그인은 선택입니다. 로그인하지 않아도 병원 안내, 요약지, 119를 모두 쓸 수 있어야 합니다.
- MVP 범위 밖의 기능(보호자에게 요약지 공유, TTS, 응급실 실시간 병상, 복용약 등록)은 구현하지 않습니다.
- 웹(1280) 화면은 보류 상태입니다. 모바일(390) 디자인 하나로 만들고, 768px 이상에서는 앱 영역을 최대 480px로 가운데 정렬합니다(AppShell 처리).

## 기술 기준

- React와 TypeScript를 Vite에서 실행합니다.
- Tailwind CSS 4를 @tailwindcss/vite 플러그인으로 사용합니다.
- 패키지 관리자는 npm입니다. Node.js 22.12 이상을 사용합니다.
- 배포 플랫폼은 Cloudflare Workers입니다. 정적 파일은 Workers Static Assets로 제공하고, SPA 경로 fallback은 wrangler.jsonc의 `not_found_handling: "single-page-application"` 설정으로 처리하므로 public/404.html을 추가하지 않습니다. `/api/*` 요청은 `run_worker_first` 설정으로 fallback보다 먼저 worker/index.ts가 받아 `API_ORIGIN` 백엔드로 프록시합니다.
- 라우팅은 react-router를 사용하고, 경로는 src/App.tsx에서 관리합니다.
- src 내부 import는 @/ 경로 별칭을 사용합니다.
- 새 의존성은 꼭 필요한 경우에만 추가하고, PR에 이유를 적습니다. 상태 관리·데이터 요청 라이브러리는 팀 합의 없이 추가하지 않습니다.

## 코드 규칙

- 문자열에는 큰따옴표를, 문장에는 세미콜론을 사용합니다. 포맷은 Prettier가 강제하며, Tailwind 클래스 순서도 Prettier 플러그인이 정렬합니다.
- 한 줄에는 한 문장만 작성하고, 읽기 쉬운 줄바꿈을 유지합니다.
- 변수와 함수는 camelCase, React 컴포넌트와 생성자 함수는 PascalCase로 작성합니다.
- TypeScript의 strict 설정을 유지하고, 불가피한 경우가 아니면 any를 사용하지 않습니다.
- 주석과 화면 문구는 한국어로 작성합니다. 주석은 코드만 봐서는 알 수 없는 이유를 적습니다.
- 공유 컴포넌트는 src/components에, 페이지 전용 컴포넌트는 src/pages/[pageName]/components에 둡니다.
- 순수 함수(날짜 형식, 값 변환, 상태 계산 등)를 추가하면 같은 폴더에 `*.test.ts`를 함께 작성합니다.

## 스타일과 디자인 규칙

- 공통 디자인 토큰은 src/styles/theme.css의 `@theme` 변수로 관리합니다. 색은 hex를 직접 쓰지 않고 토큰 클래스(`bg-brand`, `text-muted`, `bg-emergency` 등)를 사용합니다. 필요한 색이 없으면 theme.css에 토큰을 추가합니다.
- 컴포넌트의 레이아웃과 스타일에는 Tailwind 유틸리티를 우선 사용합니다.
- 전역 초기화는 src/styles/base.css(Tailwind preflight와 겹치지 않는 차이만), 글꼴 설정은 src/styles/fonts.css의 --font-sans, 재사용 유틸리티는 src/styles/utilities.css에 둡니다.
- 글자 크기는 루트 18 / 22 / 26px 3단계이며 AppShell이 바꿉니다. 글자·버튼 높이·여백은 rem(Tailwind 간격 단위, `--spacing` 1칸 = 4px 기준)으로 써서 함께 커지게 합니다.
- 테두리, 아이콘, 모서리, 최소 터치 영역 44px, 헤더 글자 크기 컨트롤, 119 바는 px로 고정합니다.
- 본문 최소 글자는 16px(0.889rem)입니다. 예외는 헤더 "가" 버튼과 지도 자리 표시뿐입니다.
- 주요 버튼 높이는 58px 이상, 모든 터치 영역은 44px 이상입니다. 텍스트 대비는 WCAG AA 이상을 유지합니다.
- 한글 줄바꿈은 base.css의 `word-break: keep-all`을 따릅니다.
- 화면 구성은 Figma 모바일 화면을 기준으로 하고, 디자인에 없는 안내 문구나 요소를 임의로 추가하지 않습니다.

## 공통 화면 구조

- 모든 화면은 AppShell(src/components/layout/AppShell.tsx) 안에서 렌더링됩니다. AppShell이 헤더, 글자 크기 컨트롤, `main`, 하단 119 바를 제공하므로 페이지에서 `main`이나 119 바를 다시 만들지 않습니다.
- 화면 안에 자체 119 버튼이 있는 화면은 AppShell의 `hiddenEmergencyBarPaths`에 경로를 등록해 하단 바를 숨깁니다. 현재 `/emergency`, `/emergency-card`, `/hospital-empty`, `/hospital-error`입니다.
- 뒤로 가기는 헤더 로고(처음으로)만 둡니다. 모든 화면에 공통 "←"를 넣지 않고, 이전 단계 이동은 디자인에 있는 화면에만 둡니다.
- 각 화면에는 `h1`이 하나 있어야 합니다. AppShell이 경로가 바뀔 때 `h1`로 포커스를 옮기고 문서 제목을 만듭니다.
- 공통 UI는 src/components/ui.tsx(Button, ActionLink, Card, Notice, PageTitle, Progress, Chip, Disclaimer)와 ScreenElements.tsx, DesignIcon.tsx, InlineConfirm.tsx, EmergencyHelp.tsx를 먼저 확인하고 재사용합니다. 버튼 변형은 `primary`, `outline`, `quiet`, `emergency`입니다.

## 화면과 경로

디자인 화면 ID와 라우트의 대응입니다. 미구현 경로는 담당 이슈에서 src/App.tsx에 추가합니다.

| ID          | 화면                            | 경로                                       | 상태                                         |
| ----------- | ------------------------------- | ------------------------------------------ | -------------------------------------------- |
| S01         | 시작                            | `/`                                        | 구현                                         |
| S02 / S02a  | 마이크 안내 / 사용 불가         | `/mic-guide`, `/mic-guide/unavailable`     | 구현                                         |
| S03         | 음성 문진                       | `/interview`                               | 구현, STT·음성 문진 연결 (#28)               |
| S04 / S04a  | 글 입력 / 추가 질문             | `/text-input`, `/text-input/questions`     | 구현                                         |
| S05a        | 위치 확인                       | `/location`                                | 구현                                         |
| S05b        | 지역 선택                       | `/region`                                  | 구현                                         |
| S05         | 병원 안내                       | `/hospitals`                               | 구현, 진료과·병원 API 연결 (#26)             |
| S05c / S05d | 근처 병원 없음 / 병원 정보 오류 | `/hospital-empty`, `/hospital-error`       | 구현                                         |
| S06a        | 요약지 만드는 중                | `/summary-loading`                         | 구현                                         |
| S06         | 요약지                          | `/summary`                                 | 구현, 요약지 API 연결 (#26), 보관 연결 (#29) |
| E01         | 응급 전환                       | `/emergency`                               | 구현                                         |
| E02         | 응급 카드                       | `/emergency-card`                          | 구현                                         |
| E03         | 보호자 연락처 등록              | `/guardian`                                | 구현                                         |
| C01         | 보호자 저장 동의                | `/guardian-consent?from=guardian\|my-info` | 구현                                         |
| P01         | 내 정보                         | `/my-info`                                 | 계정 영역만 구현 (본문 #32)                  |
| L01 / L01a  | 로그인 / 실패                   | `/login`, `/login/failed`                  | 구현                                         |
| —           | 카카오 콜백                     | `/auth/kakao/callback`                     | 구현                                         |
| C02         | 기록 저장 동의                  | `/record-consent`                          | 구현                                         |
| H01 / H02   | 내 기록 / 기록 상세             | `/records`, `/records/:id`                 | 구현, 기록 API 연결 (#29)                    |

## API 규칙

- API를 연결하는 작업은 시작하기 전에 Notion API 목록을 먼저 확인합니다. 목록에 없는 API, 필드, 사용자 데이터 구조는 임의로 만들지 않고 백엔드 담당과 먼저 합의합니다.
- 모든 요청은 src/api/client.ts의 `apiRequest`로 보냅니다. 경로는 `/api`를 뺀 `/`로 시작합니다(예: `/auth/kakao/login`). `fetch`를 화면에서 직접 호출하지 않습니다.
- 도메인별 요청 함수는 src/api/[도메인].ts에 두고, 요청·응답 타입을 같은 파일에 정의합니다. 예: src/api/auth.ts.
- 공통 응답은 `{ isSuccess, code, message, result }`이고 `apiRequest`는 `result`만 돌려줍니다. 실패는 `ApiError`로 던지며 화면은 `code`로 분기합니다. 응답을 받지 못하면 `NETWORK_ERROR`, 형식이 다르면 `INVALID_RESPONSE`입니다.
- `AUTH_401`은 `apiRequest`가 토큰 재발급 후 한 번 재시도합니다. 재발급도 실패하면 `onUnauthenticated` 리스너로 비로그인 상태를 알립니다. 화면에서 재발급을 따로 구현하지 않습니다.
- 서버와 주고받는 enum 값은 src/api/enums.ts(UPPER_SNAKE_CASE)를 사용합니다. 화면 문구로의 변환은 각 화면에서 합니다.
- 수집 항목은 `null`이면 "확인 못 했어요", `[]`이면 "없음"입니다. src/api/values.ts의 `formatCollectedList`, `formatCollectedValue`를 사용합니다.
- 백엔드 없이 화면을 확인할 때는 `.env.local`에 `VITE_API_MOCK=true`를 두고, 각 API 함수가 `isMockApi`를 보고 가짜 응답을 돌려주게 합니다. 이 값은 Workers Builds 빌드 변수에 등록하지 않습니다.
- 인증 토큰은 백엔드가 HttpOnly 쿠키로 발급합니다. 프론트는 토큰을 localStorage나 sessionStorage에 저장하지 않습니다.

## 상태 관리

- 앱 상태는 src/stores/appStore.ts의 `useAppStore()`와 `appActions`로 다룹니다. 문진 답변은 `appActions.answer(key, value)`로 저장합니다.
- src/stores/model.ts의 `Interview`, `SummaryData`는 프론트 화면용 타입이며 백엔드 응답 계약이 아닙니다. API를 연결하면 src/api의 타입에서 변환합니다.
- 문진·로그인 상태는 메모리에만 두고, 기록과 보호자는 서버 값만 쓰며 프론트에 사본을 만들지 않습니다. 로컬 저장소에는 글자 크기만, sessionStorage에는 카카오 로그인 복귀 정보(loginIntent)와 진행 중인 문진·요약지 ID(summarySession)만 저장합니다. 증상·진료과 같은 문진 내용은 저장하지 않습니다. 저장소 접근은 try/catch로 감쌉니다.
- 로그인이 필요한 화면으로 보내기 전에는 `appActions.prepareLogin(returnTo, saveTarget)`을 호출해 로그인 후 돌아올 화면을 기억합니다.

## 개인정보와 문구

- 화면, 테스트, 가짜 데이터에는 실제 개인 정보나 진료 정보를 쓰지 않습니다. 병원명은 OO·△△·XX, 전화번호는 033-000-0000·010-0000-0000 형식의 샘플을 사용합니다.
- 보호자 정보는 이름 없이 관계와 전화번호만 받습니다. 카카오에서는 닉네임만 받으며, 닉네임이 없을 때의 대체 표시를 함께 구현합니다.
- 요약지에는 이름과 연락처를 넣지 않습니다. 응급 카드에는 앱이 판단할 수 없는 의식·호흡 상태를 넣지 않습니다.
- 저장 정책이 확정되기 전이므로 "이 기기에만 저장돼요", "서버로 보내지 않아요"처럼 저장 위치를 단정하는 문구를 쓰지 않습니다.
- 음성(오디오)은 저장하지 않고 인식된 텍스트만 씁니다. 음성 인식 방식에 따라 오디오가 외부 서버로 전송될 수 있으므로 음성 관련 문구는 "목소리는 저장하지 않아요"까지만 사용합니다.
- 면책 문구는 정해진 위치에만 둡니다. 시작 화면은 전체 문구, 병원 안내·요약지·응급 카드·응급 전환은 본문 안 "진단이 아니에요/아닙니다" 안내입니다. 다른 화면에 추가하지 않습니다.
- 화면 문구는 차분한 해요체로, 어르신이 이해하기 쉬운 짧은 문장으로 씁니다.

## 작업 흐름

- 저장소에서 기능 작업을 할 때는 먼저 담당자와 라벨을 지정한 GitHub 이슈를 준비하고, 이슈 단위 브랜치에서 작업합니다. 자세한 절차는 `.claude/skills/issue-to-pr`(Codex는 `.agents/skills/issue-to-pr`)를 따릅니다.
- 커밋 메시지는 이모지 없이 "작업 유형: 요약" 형식으로 작성합니다. 예: Feat: 진료 화면 추가, Fix: 날짜 표시 수정, Docs: 개발 안내 보완.
- PR에는 변경 요약, 확인한 항목, UI 변경 시 화면 캡처를 포함합니다. 적절한 라벨과 담당자, 리뷰어를 지정합니다.
- PR을 열기 전에 CONTRIBUTING.md의 "PR 전 자기 검토 체크리스트"를 확인합니다.
- 다른 담당자의 화면 파일과 공통 파일(AppShell, ui.tsx, theme.css, App.tsx, src/api/client.ts)은 이슈 범위에 포함된 경우에만 수정하고, PR에 수정 이유를 적습니다.
- 배포는 Cloudflare Workers Builds Git 연동으로 관리합니다. 빌드 명령은 `npm run build`, 배포 명령은 `npx wrangler deploy`이고, 프로덕션이 아닌 브랜치는 기본값 `npx wrangler versions upload`로 미리보기 버전을 올립니다. GitHub Actions는 format, lint, typecheck, test, build를 확인합니다. 브랜치와 PR의 미리보기 URL도 리뷰에 활용합니다.
- `docs/`는 로컬 참고 자료이므로 커밋하지 않습니다. 팀이 계속 따라야 하는 결정은 이 파일이나 `.claude/skills/screen-impl/screens.md`로 옮겨 근거로 삼습니다.

## 참고 문서

- API 목록(Notion): https://app.notion.com/p/405169f76f9f804b8dd7e52aea15d932
- 디자인(Figma 모바일 화면): https://www.figma.com/design/B8SyYNgeBYqoH2PbDTtN3E/?node-id=1-2
- 화면 구현 절차와 완료 기준: `.claude/skills/screen-impl`
- 화면별 디자인 결정(화면 연결, 상태, 예외 트리거): `.claude/skills/screen-impl/screens.md`

## 명령

- 개발 서버: npm run dev
- 정적 검사: npm run lint
- 포맷 적용 / 확인: npm run format / npm run format:check
- 테스트: npm run test
- 타입 검사: npm run typecheck
- 프로덕션 빌드: npm run build
- Worker 런타임으로 빌드 결과 실행: npm run preview:worker
