# 기여 안내

진료한장 프로젝트에 기여해 주셔서 감사합니다. 이 문서는 이슈부터 PR 리뷰까지의 기본 협업 흐름을 안내합니다.

## 개발 지침

저장소의 기본 개발 규칙은 [`AGENTS.md`](./AGENTS.md)를 따릅니다. 기술 구성, 코드 스타일, 폴더 구조를 변경할 때는 해당 지침도 함께 확인하고 필요한 경우 갱신합니다.

## 개발 환경

- Node.js 22.12 이상 (`.nvmrc` 참고)
- npm 10.9 이상
- VS Code를 쓰면 `.vscode/extensions.json`의 추천 확장(ESLint, Prettier, Tailwind CSS IntelliSense, EditorConfig)을 설치합니다.

```bash
npm ci
npm run dev
```

의존성을 추가하거나 바꿀 때는 `npm install <패키지>`를 사용하고, 바뀐 `package-lock.json`을 함께 커밋합니다.

PR을 올리기 전에 아래 검사를 실행합니다.

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
```

## 작업 흐름

1. 작업에 맞는 GitHub 이슈를 확인하거나 준비하고, 담당자와 라벨을 지정합니다.
2. 이슈 단위 브랜치를 만들어 작업합니다.
3. 변경을 작고 검토하기 쉬운 단위로 커밋합니다.
4. 기본 브랜치를 대상으로 PR을 열고 리뷰를 요청합니다.
5. 리뷰 의견과 CI 결과를 반영한 뒤 병합합니다.

브랜치 이름은 아래 형식을 권장합니다.

```text
feat/123-add-visit-summary
fix/123-correct-date-display
docs/123-update-guide
```

`123`은 GitHub 이슈 번호입니다. 이 형식은 협업을 위한 제안이며 팀에서 더 적합한 규칙을 정하면 함께 바꿉니다.

## 커밋 메시지

이모지 없이 `작업 유형: 요약` 형식으로 변경 목적을 간결하게 작성합니다. 작업 유형은 Feat, Fix, Refactor, Style, Docs, Test, Chore 중에서 고릅니다.

```text
Feat: 진료 요약 화면 추가
Fix: 날짜 표시 수정
Refactor: 진료 카드 구조 정리
Docs: 개발 안내 보완
```

## Pull Request

- 저장소의 PR 템플릿을 사용합니다.
- 배경과 변경 사항, 실행한 검증, 영향 범위를 구체적으로 적습니다.
- 완료되는 이슈는 `Closes #123`, 계속 열어둘 이슈는 `Refs #123`으로 연결합니다.
- UI가 바뀌면 변경 전후를 확인할 수 있는 화면 캡처를 첨부합니다.
- 담당자와 리뷰어를 지정하고, 최소 한 명의 리뷰 승인을 받은 뒤 병합합니다.
- GitHub Actions의 format, lint, typecheck, test, build 검사가 모두 통과해야 합니다.
- Cloudflare Pages Preview에서 배포 화면과 주요 경로를 확인하고 PR에 결과를 남깁니다.

## 보안과 데이터

- 비밀 키와 토큰은 저장소에 커밋하지 않습니다. 로컬 환경 변수 파일도 커밋하지 않습니다.
- 개발과 화면 예시에는 실제 개인 정보나 진료 정보를 사용하지 않습니다.
- 새 환경 변수나 외부 서비스 설정이 필요하면 PR에 이름과 설정 위치를 설명하고, 실제 비밀 값은 안전한 환경 변수 저장소에 등록합니다.
