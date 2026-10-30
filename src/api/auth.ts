import { apiRequest, isMockApi } from "@/api/client";

// 카카오가 인가 코드를 돌려보낼 프론트 콜백 경로입니다. 서버 허용 목록과 카카오 앱에 같은 주소를 등록합니다.
export const KAKAO_CALLBACK_PATH = "/auth/kakao/callback";

export function getKakaoRedirectUri(origin = window.location.origin): string {
  return `${origin}${KAKAO_CALLBACK_PATH}`;
}

export interface KakaoAuthorizeUrlResult {
  authorizeUrl: string;
}

export interface KakaoLoginRequest {
  code: string;
  state: string;
  redirectUri: string;
}

export interface KakaoLoginResult {
  memberId: number;
  // 닉네임 제공은 선택 동의라 null일 수 있어요.
  nickname: string | null;
  isNewMember: boolean;
  needsRecordConsent: boolean;
}

// 가짜 응답에서는 카카오를 거치지 않고 바로 콜백으로 돌아옵니다.
const mockCode = "mock-code";
const mockState = "mock-state";

// 카카오 인가 URL을 받습니다. 응답과 함께 oauthState 쿠키가 발급됩니다.
export async function getKakaoAuthorizeUrl(
  redirectUri: string,
): Promise<KakaoAuthorizeUrlResult> {
  if (isMockApi) {
    const params = new URLSearchParams({ code: mockCode, state: mockState });
    return { authorizeUrl: `${redirectUri}?${params.toString()}` };
  }
  return apiRequest<KakaoAuthorizeUrlResult>("/auth/kakao/authorize-url", {
    query: { redirectUri },
  });
}

// 콜백으로 받은 code와 state를 보내 로그인합니다. 성공하면 토큰이 쿠키로 발급됩니다.
export async function loginWithKakao(
  request: KakaoLoginRequest,
): Promise<KakaoLoginResult> {
  if (isMockApi) {
    return {
      memberId: 1,
      nickname: "봄날",
      isNewMember: true,
      needsRecordConsent: true,
    };
  }
  return apiRequest<KakaoLoginResult>("/auth/kakao/login", {
    method: "POST",
    body: request,
  });
}
