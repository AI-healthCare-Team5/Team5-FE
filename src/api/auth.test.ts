import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getKakaoAuthorizeUrl,
  getKakaoRedirectUri,
  loginWithKakao,
} from "@/api/auth";
import { ApiError } from "@/api/errors";

// 모든 값은 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

function envelope(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify({ message: "", result: null, ...body }), {
    status,
  });
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("카카오 로그인 API", () => {
  it("콜백 주소는 현재 출처에 콜백 경로를 붙인다", () => {
    expect(getKakaoRedirectUri("http://localhost:5173")).toBe(
      "http://localhost:5173/auth/kakao/callback",
    );
  });

  it("인가 URL을 redirectUri와 함께 요청한다", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(200, {
        isSuccess: true,
        code: "AUTH_200",
        result: { authorizeUrl: "https://kauth.kakao.com/oauth/authorize" },
      }),
    );

    const result = await getKakaoAuthorizeUrl(
      "http://localhost:5173/auth/kakao/callback",
    );

    expect(result.authorizeUrl).toBe("https://kauth.kakao.com/oauth/authorize");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/auth/kakao/authorize-url?redirectUri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fkakao%2Fcallback",
    );
  });

  it("code·state·redirectUri를 보내 로그인한다", async () => {
    const login = {
      memberId: 1,
      nickname: null,
      isNewMember: false,
      needsRecordConsent: false,
    };
    fetchMock.mockResolvedValueOnce(
      envelope(200, { isSuccess: true, code: "AUTH_200", result: login }),
    );
    const request = {
      code: "code-1",
      state: "state-1",
      redirectUri: "http://localhost:5173/auth/kakao/callback",
    };

    await expect(loginWithKakao(request)).resolves.toEqual(login);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/kakao/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(request);
  });

  it.each(["AUTH_400", "AUTH_502"])("%s는 ApiError로 던진다", async (code) => {
    fetchMock.mockResolvedValueOnce(
      envelope(Number(code.slice(-3)), { isSuccess: false, code }),
    );

    const promise = loginWithKakao({
      code: "code-1",
      state: "state-1",
      redirectUri: "http://localhost:5173/auth/kakao/callback",
    });

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code });
  });
});
