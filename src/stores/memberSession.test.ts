import { beforeEach, describe, expect, it, vi } from "vitest";
import { logout } from "@/api/auth";
import { ApiError, NETWORK_ERROR, SERVER_ERROR_MESSAGE } from "@/api/errors";
import { deleteGuardian, saveGuardian } from "@/api/guardians";
import { getMyInfo, withdrawMember, type MemberInfo } from "@/api/members";
import { appActions, getAppState } from "@/stores/appStore";
import {
  loadMember,
  logoutMember,
  removeGuardianContact,
  saveGuardianContact,
  withdrawAccount,
} from "@/stores/memberSession";

vi.mock("@/api/auth", () => ({ logout: vi.fn() }));
vi.mock("@/api/guardians", () => ({
  saveGuardian: vi.fn(),
  deleteGuardian: vi.fn(),
}));
vi.mock("@/api/members", () => ({
  getMyInfo: vi.fn(),
  withdrawMember: vi.fn(),
}));

// 실제 백엔드가 아니라 API 함수를 가짜로 바꿔 서버 응답별 처리를 확인합니다. 모든 값은 가짜 데이터입니다.
const getInfoMock = vi.mocked(getMyInfo);
const logoutMock = vi.mocked(logout);
const withdrawMock = vi.mocked(withdrawMember);
const saveGuardianMock = vi.mocked(saveGuardian);
const deleteGuardianMock = vi.mocked(deleteGuardian);

const info: MemberInfo = {
  memberId: 1,
  nickname: "봄날",
  provider: "KAKAO",
  consents: {
    record: { agreed: true, policyVersion: "v1", agreedAt: "2026-11-04" },
    guardian: { agreed: false, policyVersion: null, agreedAt: null },
  },
  recordCount: 2,
  guardian: null,
};
const input = {
  relation: "DAUGHTER",
  phoneNumber: "010-1234-5678",
  consentAgreed: true,
} as const;

function apiError(code: string, result: unknown = null) {
  return new ApiError(code, "서버 안내 문장", Number(code.slice(-3)), result);
}

beforeEach(() => {
  for (const mock of [
    getInfoMock,
    logoutMock,
    withdrawMock,
    saveGuardianMock,
    deleteGuardianMock,
  ]) {
    mock.mockReset();
  }
  appActions.logout();
});

describe("내 정보 불러오기", () => {
  it("응답이 도착한 뒤 취소됐다면 로그인 상태를 되살리지 않는다", async () => {
    const controller = new AbortController();
    getInfoMock.mockImplementation(async () => {
      // 응답을 받은 직후 로그아웃이 시작되어 요청이 취소된 상황입니다.
      controller.abort();
      return info;
    });

    await expect(loadMember(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(getAppState().loggedIn).toBe(false);
  });

  it("성공하면 서버 값을 store에 반영한다", async () => {
    getInfoMock.mockResolvedValue(info);

    await expect(loadMember()).resolves.toBe("loggedIn");

    expect(getAppState()).toMatchObject({
      loggedIn: true,
      nickname: "봄날",
      recordConsent: true,
      recordCount: 2,
    });
  });

  it("AUTH_401이면 로그인하지 않은 것으로 다룬다", async () => {
    appActions.applyMember(info);
    getInfoMock.mockRejectedValue(apiError("AUTH_401"));

    await expect(loadMember()).resolves.toBe("loggedOut");

    expect(getAppState().loggedIn).toBe(false);
  });

  it("서버 오류는 로그인 상태를 바꾸지 않고 던진다", async () => {
    appActions.applyMember(info);
    getInfoMock.mockRejectedValue(apiError("MEMBER_500"));

    await expect(loadMember()).rejects.toMatchObject({ code: "MEMBER_500" });

    expect(getAppState().loggedIn).toBe(true);
  });
});

describe("로그아웃·탈퇴", () => {
  it("로그아웃 요청이 성공해야 로그아웃된 것으로 바꾼다", async () => {
    appActions.applyMember(info);
    logoutMock.mockResolvedValue(undefined);

    await logoutMember();

    expect(getAppState().loggedIn).toBe(false);
  });

  it("로그아웃 요청이 실패하면 쿠키가 남아 있을 수 있어 로그인 상태를 그대로 둔다", async () => {
    appActions.applyMember(info);
    logoutMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));

    await expect(logoutMember()).rejects.toMatchObject({
      code: NETWORK_ERROR,
    });

    expect(getAppState().loggedIn).toBe(true);
  });

  it("탈퇴가 성공하면 계정 값을 모두 비운다", async () => {
    appActions.applyMember({
      ...info,
      guardian: { relation: "SON", phoneNumber: "010-****-1111" },
    });
    withdrawMock.mockResolvedValue(undefined);

    await expect(withdrawAccount()).resolves.toBe("withdrawn");

    expect(getAppState()).toMatchObject({
      loggedIn: false,
      recordConsent: false,
      guardian: null,
      recordCount: 0,
    });
  });

  it("탈퇴 요청이 AUTH_401이면 탈퇴한 것으로 다루지 않고 로그인이 풀린 것으로만 다룬다", async () => {
    appActions.applyMember(info);
    withdrawMock.mockRejectedValue(apiError("AUTH_401"));

    await expect(withdrawAccount()).resolves.toBe("loggedOut");

    expect(getAppState().loggedIn).toBe(false);
  });

  it("탈퇴 요청이 서버 오류면 계정 값을 그대로 둔다", async () => {
    appActions.applyMember(info);
    withdrawMock.mockRejectedValue(apiError("MEMBER_500"));

    await expect(withdrawAccount()).rejects.toMatchObject({
      code: "MEMBER_500",
    });

    expect(getAppState()).toMatchObject({ loggedIn: true, recordCount: 2 });
  });
});

describe("보호자", () => {
  it("등록하면 응답의 관계와 가린 번호를 store에 담고 동의한 것으로 표시한다", async () => {
    appActions.applyMember(info);
    saveGuardianMock.mockResolvedValue({
      guardianId: 4,
      relation: "DAUGHTER",
      phoneNumber: "010-****-5678",
    });

    await expect(saveGuardianContact(input)).resolves.toEqual({
      kind: "saved",
    });

    expect(saveGuardianMock).toHaveBeenCalledWith(input, undefined);
    expect(getAppState()).toMatchObject({
      guardian: { relation: "DAUGHTER", phoneNumber: "010-****-5678" },
      guardianConsent: true,
    });
  });

  it("GUARDIAN_400은 칸별 이유를 돌려주고 store를 바꾸지 않는다", async () => {
    appActions.applyMember(info);
    const errors = [
      { field: "phoneNumber", reason: "숫자 10~11자리여야 해요" },
    ];
    saveGuardianMock.mockRejectedValue(apiError("GUARDIAN_400", { errors }));

    await expect(saveGuardianContact(input)).resolves.toEqual({
      kind: "invalid",
      message: "서버 안내 문장",
      fieldErrors: errors,
    });
    expect(getAppState().guardian).toBeNull();
  });

  it("등록 중 AUTH_401이면 로그인으로 안내한다", async () => {
    appActions.applyMember(info);
    saveGuardianMock.mockRejectedValue(apiError("AUTH_401"));

    await expect(saveGuardianContact(input)).resolves.toEqual({
      kind: "needsLogin",
    });
    expect(getAppState().loggedIn).toBe(false);
  });

  it("응답이 도착한 뒤 화면을 떠나 취소됐다면 store를 바꾸지 않는다", async () => {
    appActions.applyMember(info);
    const controller = new AbortController();
    saveGuardianMock.mockImplementation(async () => {
      controller.abort();
      return { guardianId: 4, relation: "SON", phoneNumber: "010-****-5678" };
    });

    await expect(
      saveGuardianContact(input, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(getAppState().guardian).toBeNull();
  });

  it("저장 중 로그아웃했다면 늦게 온 응답으로 보호자를 되살리지 않는다", async () => {
    appActions.applyMember(info);
    saveGuardianMock.mockImplementation(async () => {
      appActions.logout();
      return { guardianId: 4, relation: "SON", phoneNumber: "010-****-5678" };
    });

    await expect(saveGuardianContact(input)).resolves.toEqual({
      kind: "needsLogin",
    });

    expect(getAppState()).toMatchObject({
      loggedIn: false,
      guardian: null,
      guardianConsent: false,
    });
  });

  it("네트워크 오류는 실패 안내로 돌려주고 store를 바꾸지 않는다", async () => {
    appActions.applyMember(info);
    saveGuardianMock.mockRejectedValue(
      new ApiError("NETWORK_ERROR", "서버 안내 문장", 0),
    );

    await expect(saveGuardianContact(input)).resolves.toMatchObject({
      kind: "failed",
    });
    expect(getAppState().guardian).toBeNull();
  });

  it("서버 오류는 공통 안내로 돌려준다", async () => {
    saveGuardianMock.mockRejectedValue(apiError("GUARDIAN_500"));

    await expect(saveGuardianContact(input)).resolves.toEqual({
      kind: "failed",
      message: SERVER_ERROR_MESSAGE,
    });
  });

  it("지우면 보호자와 동의를 함께 비운다", async () => {
    appActions.applyMember({
      ...info,
      guardian: { relation: "SON", phoneNumber: "010-****-1111" },
    });
    appActions.setGuardian({ relation: "SON", phoneNumber: "010-****-1111" });
    deleteGuardianMock.mockResolvedValue(undefined);

    await expect(removeGuardianContact()).resolves.toEqual({
      kind: "removed",
    });

    expect(getAppState()).toMatchObject({
      guardian: null,
      guardianConsent: false,
    });
  });

  it("이미 없는 보호자(GUARDIAN_404)를 지우려 해도 지워진 상태로 맞춘다", async () => {
    appActions.setGuardian({ relation: "SON", phoneNumber: "010-****-1111" });
    deleteGuardianMock.mockRejectedValue(apiError("GUARDIAN_404"));

    await expect(removeGuardianContact()).resolves.toEqual({
      kind: "removed",
    });
    expect(getAppState().guardian).toBeNull();
  });

  it("지우기가 서버 오류면 보호자를 그대로 둔다", async () => {
    appActions.setGuardian({ relation: "SON", phoneNumber: "010-****-1111" });
    deleteGuardianMock.mockRejectedValue(apiError("GUARDIAN_500"));

    await expect(removeGuardianContact()).resolves.toEqual({
      kind: "failed",
      message: SERVER_ERROR_MESSAGE,
    });
    expect(getAppState().guardian).not.toBeNull();
  });

  it("코드 실수는 안내로 바꾸지 않고 던진다", async () => {
    saveGuardianMock.mockRejectedValue(new TypeError("코드 실수"));

    await expect(saveGuardianContact(input)).rejects.toThrow(TypeError);
  });
});
