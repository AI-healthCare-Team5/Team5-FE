import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR, SERVER_ERROR_MESSAGE } from "@/api/errors";
import { saveSummaryToRecords } from "@/api/records";
import { appActions, getAppState } from "@/stores/appStore";
import { beginIntakeSession, readIntakeSession } from "@/stores/intakeSession";
import { saveCurrentSummary } from "@/stores/recordSave";
import {
  readSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";

vi.mock("@/api/records", () => ({ saveSummaryToRecords: vi.fn() }));

// 실제 백엔드가 아니라 API 함수를 가짜로 바꿔 서버 응답별 처리를 확인합니다. 모든 값은 가짜 데이터입니다.
const session = { intakeId: "intake-1", summaryId: "summary-1" };
const saveMock = vi.mocked(saveSummaryToRecords);

function apiError(code: string, result: unknown = null) {
  return new ApiError(code, "서버 안내 문장", Number(code.slice(-3)), result);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  saveMock.mockReset();
  appActions.logout();
  appActions.completeLogin(
    { nickname: "봄날", needsRecordConsent: false },
    { returnTo: "/summary", saveTarget: session },
  );
});

describe("요약지 보관", () => {
  it("서버가 보관했다고 알린 뒤에만 보관한 것으로 표시한다", async () => {
    const pending = deferred<{ medicalRecordId: number; savedAt: string }>();
    saveMock.mockReturnValue(pending.promise);

    const outcome = saveCurrentSummary(session);
    expect(getAppState().summarySaved).toBe(false);
    pending.resolve({ medicalRecordId: 12, savedAt: "2026-11-04" });

    await expect(outcome).resolves.toEqual({
      kind: "saved",
      medicalRecordId: 12,
      alreadySaved: false,
    });
    expect(getAppState().summarySaved).toBe(true);
    expect(saveMock).toHaveBeenCalledWith("summary-1");
  });

  it("보관하면 서버가 지운 문진·요약지의 기억도 함께 지운다", async () => {
    beginIntakeSession({ intakeId: "intake-1" } as never);
    saveSummarySession(session);
    saveMock.mockResolvedValue({ medicalRecordId: 12, savedAt: "x" });

    await saveCurrentSummary(session);

    expect(readSummarySession()).toBeNull();
    expect(readIntakeSession()).toBeNull();
  });

  it("이미 보관한 요약지(SUMMARY_409와 기록 ID)도 기억을 지운다", async () => {
    saveSummarySession(session);
    saveMock.mockRejectedValue(apiError("SUMMARY_409", { medicalRecordId: 7 }));

    await saveCurrentSummary(session);

    expect(readSummarySession()).toBeNull();
  });

  it.each([
    ["아직 만드는 중(SUMMARY_409, result null)", apiError("SUMMARY_409")],
    ["동의 없음(CONSENT_403)", apiError("CONSENT_403")],
    ["로그인 풀림(AUTH_401)", apiError("AUTH_401")],
    ["서버 오류", apiError("SUMMARY_500")],
  ])(
    "%s이면 서버에 요약지가 남아 있으므로 기억을 지우지 않는다",
    async (_name, error) => {
      saveSummarySession(session);
      saveMock.mockRejectedValue(error);

      await saveCurrentSummary(session);

      expect(readSummarySession()).toEqual(session);
    },
  );

  it("SUMMARY_409에 기록 ID가 있으면 이미 보관한 것으로 다룬다", async () => {
    saveMock.mockRejectedValue(apiError("SUMMARY_409", { medicalRecordId: 7 }));

    await expect(saveCurrentSummary(session)).resolves.toEqual({
      kind: "saved",
      medicalRecordId: 7,
      alreadySaved: true,
    });
    expect(getAppState().summarySaved).toBe(true);
  });

  it("SUMMARY_409의 result가 null이면 보관한 것으로 표시하지 않고 만드는 중 화면으로 보낸다", async () => {
    saveMock.mockRejectedValue(apiError("SUMMARY_409"));

    await expect(saveCurrentSummary(session)).resolves.toEqual({
      kind: "notReady",
    });
    expect(getAppState().summarySaved).toBe(false);
  });

  it("CONSENT_403이면 동의가 없는 것으로 되돌리고 동의 화면으로 보낸다", async () => {
    saveMock.mockRejectedValue(apiError("CONSENT_403"));

    await expect(saveCurrentSummary(session)).resolves.toEqual({
      kind: "needsConsent",
    });
    expect(getAppState()).toMatchObject({
      recordConsent: false,
      loggedIn: true,
      summarySaved: false,
    });
  });

  it("AUTH_401이면 로그아웃된 것으로 바꾸고 로그인으로 보낸다", async () => {
    saveMock.mockRejectedValue(apiError("AUTH_401"));

    await expect(saveCurrentSummary(session)).resolves.toEqual({
      kind: "needsLogin",
    });
    expect(getAppState()).toMatchObject({
      loggedIn: false,
      summarySaved: false,
      // 로그인 뒤 이어서 보관하도록 기억은 남긴다
      saveTarget: session,
    });
  });

  it.each(["SUMMARY_403", "SUMMARY_404"])(
    "%s이면 기억한 문진·요약지를 지우고 처음으로 보낸다",
    async (code) => {
      beginIntakeSession({ intakeId: "intake-1" } as never);
      saveMock.mockRejectedValue(apiError(code));

      await expect(saveCurrentSummary(session)).resolves.toEqual({
        kind: "gone",
      });
      expect(readIntakeSession()).toBeNull();
      expect(getAppState().summarySaved).toBe(false);
    },
  );

  it.each([
    ["서버 오류", apiError("SUMMARY_500")],
    ["네트워크 실패", new ApiError(NETWORK_ERROR, "", 0)],
  ])(
    "%s이면 보관하지 않은 채 공통 안내를 주고 다시 시도할 수 있다",
    async (_name, error) => {
      saveMock.mockRejectedValueOnce(error);

      await expect(saveCurrentSummary(session)).resolves.toEqual({
        kind: "failed",
        message: SERVER_ERROR_MESSAGE,
      });
      expect(getAppState().summarySaved).toBe(false);

      saveMock.mockResolvedValueOnce({ medicalRecordId: 1, savedAt: "x" });
      await expect(saveCurrentSummary(session)).resolves.toMatchObject({
        kind: "saved",
      });
    },
  );

  it("같은 요약지를 동시에 두 번 보관하려 해도 요청은 한 번만 보낸다", async () => {
    const pending = deferred<{ medicalRecordId: number; savedAt: string }>();
    saveMock.mockReturnValue(pending.promise);

    const first = saveCurrentSummary(session);
    const second = saveCurrentSummary({ ...session });
    pending.resolve({ medicalRecordId: 5, savedAt: "x" });

    expect(await first).toEqual(await second);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it("끝난 뒤에는 새 요청을 보낼 수 있다", async () => {
    saveMock.mockResolvedValue({ medicalRecordId: 5, savedAt: "x" });

    await saveCurrentSummary(session);
    await saveCurrentSummary(session);

    expect(saveMock).toHaveBeenCalledTimes(2);
  });

  it("ApiError가 아닌 코드 실수는 안내로 바꾸지 않고 그대로 던진다", async () => {
    saveMock.mockRejectedValue(new TypeError("코드 실수"));

    await expect(saveCurrentSummary(session)).rejects.toThrow(TypeError);
    expect(getAppState().summarySaved).toBe(false);
  });
});
