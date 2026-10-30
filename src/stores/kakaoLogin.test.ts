import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/errors";
import { loginWithKakaoCallback } from "@/stores/kakaoLogin";
import { readLoginIntent, saveLoginIntent } from "@/stores/loginIntent";

// 모든 값은 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Promise<Response>;

const saveTarget = { intakeId: "intake-1", summaryId: "summary-1" };
let fetchMock: ReturnType<typeof vi.fn<Handler>>;
let codeIndex = 0;

function createStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

function loginResponse(needsRecordConsent: boolean) {
  return new Response(
    JSON.stringify({
      isSuccess: true,
      code: "AUTH_200",
      message: "로그인 성공",
      result: {
        memberId: 1,
        nickname: "봄날",
        isNewMember: false,
        needsRecordConsent,
      },
    }),
    { status: 200 },
  );
}

function failedResponse(code: string) {
  return new Response(
    JSON.stringify({ isSuccess: false, code, message: "", result: null }),
    { status: Number(code.slice(-3)) },
  );
}

// 인가 코드는 테스트마다 달라야 앞 테스트의 요청을 재사용하지 않습니다.
function nextCode() {
  codeIndex += 1;
  return `code-${codeIndex}`;
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", {
    location: { origin: "http://localhost:5173" },
    sessionStorage: createStorage(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("카카오 콜백 로그인", () => {
  it("보관하러 왔고 동의가 필요하면 C02로 보내고 기억한 내용을 지운다", async () => {
    saveLoginIntent({ returnTo: "/summary", saveTarget });
    fetchMock.mockResolvedValueOnce(loginResponse(true));

    await expect(loginWithKakaoCallback(nextCode(), "state-1")).resolves.toBe(
      "/record-consent",
    );
    expect(readLoginIntent()).toEqual({
      returnTo: "/records",
      saveTarget: null,
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init.body))).toMatchObject({
      state: "state-1",
      redirectUri: "http://localhost:5173/auth/kakao/callback",
    });
  });

  it("같은 인가 코드로 두 번 불러도 요청은 한 번만 보낸다", async () => {
    saveLoginIntent({ returnTo: "/my-info", saveTarget: null });
    fetchMock.mockResolvedValue(loginResponse(true));
    const code = nextCode();

    const results = await Promise.all([
      loginWithKakaoCallback(code, "state-1"),
      loginWithKakaoCallback(code, "state-1"),
    ]);

    expect(results).toEqual(["/my-info", "/my-info"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["AUTH_400", "AUTH_502"])(
    "%s로 실패하면 기억한 내용을 남겨 둔다",
    async (code) => {
      saveLoginIntent({ returnTo: "/summary", saveTarget });
      fetchMock.mockResolvedValueOnce(failedResponse(code));

      await expect(
        loginWithKakaoCallback(nextCode(), "state-1"),
      ).rejects.toBeInstanceOf(ApiError);
      expect(readLoginIntent()).toEqual({ returnTo: "/summary", saveTarget });
    },
  );
});
