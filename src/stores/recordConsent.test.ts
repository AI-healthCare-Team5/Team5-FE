import { beforeEach, describe, expect, it, vi } from "vitest";
import { agreeToRecordConsent } from "@/api/consents";
import { ApiError, SERVER_ERROR_MESSAGE } from "@/api/errors";
import { appActions, getAppState } from "@/stores/appStore";
import { submitRecordConsent } from "@/stores/recordConsent";

vi.mock("@/api/consents", () => ({ agreeToRecordConsent: vi.fn() }));

// 실제 백엔드가 아니라 API 함수를 가짜로 바꿔 서버 응답별 처리를 확인합니다. 모든 값은 가짜 데이터입니다.
const agreeMock = vi.mocked(agreeToRecordConsent);
const consent = {
  consentId: 3,
  consentType: "RECORD",
  policyVersion: "v1",
  agreedAt: "2026-11-04",
} as const;

beforeEach(() => {
  agreeMock.mockReset();
  appActions.logout();
  appActions.completeLogin(
    { nickname: "봄날", needsRecordConsent: true },
    { returnTo: "/summary", saveTarget: null },
  );
});

describe("기록 저장 동의 보내기", () => {
  it("서버가 동의를 받은 뒤에만 동의한 것으로 표시한다", async () => {
    let resolve: (value: typeof consent) => void = () => {};
    agreeMock.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );

    const outcome = submitRecordConsent();
    expect(getAppState().recordConsent).toBe(false);
    resolve(consent);

    await expect(outcome).resolves.toEqual({ kind: "agreed" });
    expect(getAppState().recordConsent).toBe(true);
  });

  it("실패하면 동의한 것으로 표시하지 않고 서버 안내 문장을 돌려준다", async () => {
    agreeMock.mockRejectedValue(
      new ApiError("CONSENT_400", "동의 문구 버전이 달라요.", 400),
    );

    await expect(submitRecordConsent()).resolves.toEqual({
      kind: "failed",
      message: "동의 문구 버전이 달라요.",
    });
    expect(getAppState().recordConsent).toBe(false);
  });

  it("서버 오류는 공통 안내로 바꿔 준다", async () => {
    agreeMock.mockRejectedValue(new ApiError("CONSENT_500", "내부 사유", 500));

    await expect(submitRecordConsent()).resolves.toEqual({
      kind: "failed",
      message: SERVER_ERROR_MESSAGE,
    });
  });

  it("AUTH_401이면 로그아웃된 것으로 바꾼다", async () => {
    agreeMock.mockRejectedValue(new ApiError("AUTH_401", "", 401));

    await expect(submitRecordConsent()).resolves.toEqual({
      kind: "needsLogin",
    });
    expect(getAppState().loggedIn).toBe(false);
  });

  it("두 번 눌러도 요청은 한 번만 보내고, 끝난 뒤에는 다시 보낼 수 있다", async () => {
    agreeMock.mockResolvedValue(consent);

    const [first, second] = await Promise.all([
      submitRecordConsent(),
      submitRecordConsent(),
    ]);
    await submitRecordConsent();

    expect(first).toEqual(second);
    expect(agreeMock).toHaveBeenCalledTimes(2);
  });
});
