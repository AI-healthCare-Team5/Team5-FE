import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logout } from "@/api/auth";
import {
  agreeToRecordConsent,
  GUARDIAN_POLICY_VERSION,
  RECORD_POLICY_VERSION,
} from "@/api/consents";
import { ApiError } from "@/api/errors";
import {
  buildGuardianRequest,
  deleteGuardian,
  saveGuardian,
} from "@/api/guardians";
import { getMyInfo, withdrawMember } from "@/api/members";

// 실제 백엔드가 아니라 fetch를 가짜로 바꿔 요청 모양과 응답 처리를 확인합니다.
// 응답 모양은 백엔드 Swagger(MemberInfoResponse, GuardianRequest 등)를 따라 만든 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

function envelope(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify({ message: "", result: null, ...body }), {
    status,
  });
}

function ok(code: string, result: unknown = null) {
  return envelope(200, { isSuccess: true, code, result });
}

function failure(code: string, result: unknown = null) {
  return envelope(Number(code.slice(-3)), { isSuccess: false, code, result });
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("실패해야 하는 요청이 성공했어요.");
}

describe("내 정보·탈퇴·로그아웃 API", () => {
  const info = {
    memberId: 1,
    nickname: null,
    provider: "KAKAO",
    consents: {
      record: {
        agreed: true,
        policyVersion: "v1",
        agreedAt: "2026-10-30T14:00:00+09:00",
      },
      guardian: { agreed: false, policyVersion: null, agreedAt: null },
    },
    recordCount: 3,
    guardian: { relation: "DAUGHTER", phoneNumber: "010-****-5678" },
  };

  it("내 정보를 GET으로 받는다", async () => {
    fetchMock.mockResolvedValueOnce(ok("MEMBER_200", info));

    await expect(getMyInfo()).resolves.toEqual(info);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/members/me");
    expect(init.method).toBe("GET");
  });

  it("로그인하지 않았으면 재발급을 한 번 해 보고 AUTH_401을 던진다", async () => {
    // 요청마다 새 Response가 필요합니다(본문은 한 번만 읽을 수 있습니다).
    fetchMock.mockImplementation(async () => failure("AUTH_401"));

    await expect(catchError(getMyInfo())).resolves.toMatchObject({
      code: "AUTH_401",
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/members/me",
      "/api/auth/refresh",
    ]);
  });

  it("탈퇴는 DELETE /members/me로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok("MEMBER_200"));

    await expect(withdrawMember()).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/members/me");
    expect(init.method).toBe("DELETE");
  });

  it("로그아웃은 POST /auth/logout으로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok("AUTH_200"));

    await expect(logout()).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/logout");
    expect(init.method).toBe("POST");
  });

  it("로그아웃 요청이 서버 오류면 성공으로 삼지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(failure("AUTH_500"));

    await expect(catchError(logout())).resolves.toMatchObject({
      code: "AUTH_500",
    });
  });
});

describe("기록 저장 동의 API", () => {
  it("consentType RECORD와 현재 문구 버전을 보낸다", async () => {
    const result = {
      consentId: 3,
      consentType: "RECORD",
      policyVersion: RECORD_POLICY_VERSION,
      agreedAt: "2026-10-30T14:00:00+09:00",
    };
    fetchMock.mockResolvedValueOnce(ok("CONSENT_201", result));

    await expect(agreeToRecordConsent()).resolves.toEqual(result);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/consents");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      consentType: "RECORD",
      policyVersion: RECORD_POLICY_VERSION,
    });
  });

  it("이미 같은 버전에 동의했다는 CONSENT_200도 성공이다", async () => {
    fetchMock.mockResolvedValueOnce(
      ok("CONSENT_200", {
        consentId: 3,
        consentType: "RECORD",
        policyVersion: "v1",
        agreedAt: "2026-10-30T14:00:00+09:00",
      }),
    );

    await expect(agreeToRecordConsent()).resolves.toMatchObject({
      consentId: 3,
    });
  });

  it("문구 버전이 맞지 않으면 CONSENT_400의 칸별 이유를 담아 던진다", async () => {
    fetchMock.mockResolvedValueOnce(
      failure("CONSENT_400", {
        errors: [{ field: "policyVersion", reason: "문구 버전이 달라요" }],
      }),
    );

    const error = await catchError(agreeToRecordConsent());

    expect(error.code).toBe("CONSENT_400");
    expect(error.result).toEqual({
      errors: [{ field: "policyVersion", reason: "문구 버전이 달라요" }],
    });
  });
});

describe("보호자 API", () => {
  it("관계·숫자만 남긴 전화번호·동의·문구 버전을 한 요청으로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(
      ok("GUARDIAN_200", {
        guardianId: 4,
        relation: "DAUGHTER",
        phoneNumber: "010-****-5678",
      }),
    );

    const result = await saveGuardian({
      relation: "DAUGHTER",
      phoneNumber: "010-1234-5678",
      consentAgreed: true,
    });

    expect(result).toEqual({
      guardianId: 4,
      relation: "DAUGHTER",
      phoneNumber: "010-****-5678",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/members/me/guardian");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({
      relation: "DAUGHTER",
      phoneNumber: "01012345678",
      consentAgreed: true,
      policyVersion: GUARDIAN_POLICY_VERSION,
    });
  });

  it("동의에 체크하지 않은 값도 그대로 보내 서버가 field consentAgreed로 거절하게 한다", () => {
    expect(
      buildGuardianRequest({
        relation: "ETC",
        phoneNumber: "0212345678",
        consentAgreed: false,
      }),
    ).toMatchObject({ consentAgreed: false, phoneNumber: "0212345678" });
  });

  it("GUARDIAN_400은 칸별 이유를 담아 던진다", async () => {
    const errors = [
      { field: "phoneNumber", reason: "숫자 10~11자리여야 해요" },
      { field: "consentAgreed", reason: "동의에 체크해 주세요" },
    ];
    fetchMock.mockResolvedValueOnce(failure("GUARDIAN_400", { errors }));

    const error = await catchError(
      saveGuardian({
        relation: "SON",
        phoneNumber: "123",
        consentAgreed: false,
      }),
    );

    expect(error.code).toBe("GUARDIAN_400");
    expect(error.result).toEqual({ errors });
  });

  it("삭제는 DELETE로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok("GUARDIAN_200"));

    await expect(deleteGuardian()).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/members/me/guardian");
    expect(init.method).toBe("DELETE");
  });

  it("등록된 보호자가 없으면 GUARDIAN_404다", async () => {
    fetchMock.mockResolvedValueOnce(failure("GUARDIAN_404"));

    await expect(catchError(deleteGuardian())).resolves.toMatchObject({
      code: "GUARDIAN_404",
    });
  });
});
