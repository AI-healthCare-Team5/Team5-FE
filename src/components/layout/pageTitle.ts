import { KAKAO_CALLBACK_PATH } from "@/api/auth";

const siteName = "진료한장";

// 브라우저 탭에 보일 화면 이름입니다. 화면 제목(h1)은 안내 문장이라 탭 제목으로 쓰지 않습니다.
export const pageTitles: Record<string, string> = {
  "/": "메인화면",
  "/mic-guide": "마이크 안내",
  "/mic-guide/unavailable": "마이크 사용 불가",
  "/interview": "음성 문진",
  "/text-input": "글로 입력",
  "/text-input/questions": "글 입력 문진",
  "/location": "위치 확인",
  "/region": "지역 선택",
  "/hospitals": "병원 안내",
  "/hospital-empty": "병원 검색 결과 없음",
  "/hospital-error": "병원 검색 오류",
  "/summary-loading": "요약지 만드는 중",
  "/summary": "요약지",
  "/emergency": "응급 안내",
  "/emergency-card": "응급 카드",
  "/guardian": "보호자 연락처",
  "/guardian-consent": "보호자 동의",
  "/login": "로그인",
  "/login/failed": "로그인 실패",
  [KAKAO_CALLBACK_PATH]: "로그인 중",
  "/record-consent": "기록 저장 동의",
  "/records": "내 기록",
  "/my-info": "내 정보",
};

const recordDetailPath = /^\/records\/[^/]+$/;

// react-router는 끝 슬래시를 같은 경로로 맞추므로 비교 전에 떼어 냅니다(`/`는 그대로 둡니다).
function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function getPageTitle(pathname: string): string {
  const path = normalizePath(pathname);
  const name = recordDetailPath.test(path)
    ? "기록 상세"
    : (pageTitles[path] ?? "없는 페이지");
  return `${name} · ${siteName}`;
}
