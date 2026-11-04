import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// VITE_API_MOCK=true일 때의 가짜 회원·기록 응답을 확인합니다. 실제 백엔드가 아니라 서버 규칙을 흉내 낸 가짜 구현이고,
// 규칙은 백엔드 Swagger를 따릅니다. 네트워크는 쓰지 않습니다.
// isMockApi는 모듈을 불러올 때 정해지므로 테스트마다 환경 변수를 정하고 모듈을 새로 불러옵니다.
async function loadApi() {
  vi.resetModules();
  vi.stubEnv("VITE_API_MOCK", "true");
  const [auth, consents, guardians, members, records, intakes, summaries] =
    await Promise.all([
      import("@/api/auth"),
      import("@/api/consents"),
      import("@/api/guardians"),
      import("@/api/members"),
      import("@/api/records"),
      import("@/api/intakes"),
      import("@/api/summaries"),
    ]);
  return {
    ...auth,
    ...consents,
    ...guardians,
    ...members,
    ...records,
    ...intakes,
    ...summaries,
  };
}

type Api = Awaited<ReturnType<typeof loadApi>>;

const login = (api: Api) =>
  api.loginWithKakao({ code: "c", state: "s", redirectUri: "r" });

// 문진을 끝냅니다. 요약지는 아직 조회하지 않아 만드는 중입니다.
async function generatingSummaryId(api: Api): Promise<string> {
  let current = await api.startIntake({
    inputMode: "BUTTON",
    bodyPart: "LEG_KNEE",
    onset: "DAYS_2_3",
  });
  for (let guard = 0; guard < 20 && current.question; guard += 1) {
    const question = current.question;
    const result = await api.answerIntake(current.intakeId, {
      questionId: question.questionId,
      ...(question.answerType === "FREE_TEXT"
        ? { inputMode: "TEXT" as const, answer: "없어요" }
        : {
            inputMode: "BUTTON" as const,
            answer: question.options?.[0].code ?? "NO",
          }),
    });
    if (result.kind !== "advanced") throw new Error(result.kind);
    current = result.intake;
  }
  return current.summaryId!;
}

// 요약지가 DONE이 될 때까지 조회합니다.
async function doneSummaryId(api: Api): Promise<string> {
  const summaryId = await generatingSummaryId(api);
  for (let guard = 0; guard < 10; guard += 1) {
    if ((await api.getSummary(summaryId)).status === "DONE") break;
  }
  return summaryId;
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code ?? "코드 없음";
  }
  return "성공";
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("가짜 응답에서는 네트워크를 쓰지 않아야 해요");
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("가짜 로그인과 내 정보", () => {
  it("로그인하지 않으면 로그인이 필요한 API가 AUTH_401이다", async () => {
    const api = await loadApi();

    expect(await codeOf(api.getMyInfo())).toBe("AUTH_401");
    expect(await codeOf(api.listRecords())).toBe("AUTH_401");
    expect(await codeOf(api.agreeToRecordConsent())).toBe("AUTH_401");
    expect(await codeOf(api.deleteGuardian())).toBe("AUTH_401");
  });

  it("첫 로그인은 동의가 필요하고 예시 기록 3건이 있다", async () => {
    const api = await loadApi();

    const result = await login(api);
    const info = await api.getMyInfo();

    expect(result).toMatchObject({
      isNewMember: true,
      needsRecordConsent: true,
    });
    expect(info.recordCount).toBe(3);
    expect(info.consents.record).toEqual({
      agreed: false,
      policyVersion: null,
      agreedAt: null,
    });
    expect(info.guardian).toBeNull();
  });

  it("로그아웃하면 다시 AUTH_401이고, 다시 로그인해도 동의와 기록이 남아 있다", async () => {
    const api = await loadApi();
    await login(api);
    await api.agreeToRecordConsent();

    await api.logout();
    expect(await codeOf(api.getMyInfo())).toBe("AUTH_401");
    const again = await login(api);

    expect(again).toMatchObject({
      isNewMember: false,
      needsRecordConsent: false,
    });
    expect((await api.getMyInfo()).recordCount).toBe(3);
  });

  it("탈퇴하면 기록과 동의, 보호자가 지워지고 다시 로그인해도 기록이 돌아오지 않는다", async () => {
    const api = await loadApi();
    await login(api);
    await api.agreeToRecordConsent();
    await api.saveGuardian({
      relation: "SON",
      phoneNumber: "01012345678",
      consentAgreed: true,
    });

    await api.withdrawMember();
    expect(await codeOf(api.getMyInfo())).toBe("AUTH_401");
    const again = await login(api);
    const info = await api.getMyInfo();

    expect(again.needsRecordConsent).toBe(true);
    expect(info.recordCount).toBe(0);
    expect(info.guardian).toBeNull();
    expect(info.consents.guardian.agreed).toBe(false);
  });
});

describe("가짜 기록 저장 동의", () => {
  it("동의하면 내 정보에 현재 문구 버전이 보이고, 다시 동의해도 같은 동의를 돌려준다", async () => {
    const api = await loadApi();
    await login(api);

    const first = await api.agreeToRecordConsent();
    const second = await api.agreeToRecordConsent();

    expect(first.policyVersion).toBe(api.RECORD_POLICY_VERSION);
    expect(second.consentId).toBe(first.consentId);
    expect((await api.getMyInfo()).consents.record).toMatchObject({
      agreed: true,
      policyVersion: "v1",
    });
  });
});

describe("가짜 요약지 보관", () => {
  it("동의가 없으면 CONSENT_403이고 요약지는 그대로 남는다", async () => {
    const api = await loadApi();
    const summaryId = await doneSummaryId(api);
    await login(api);

    expect(await codeOf(api.saveSummaryToRecords(summaryId))).toBe(
      "CONSENT_403",
    );

    expect((await api.getSummary(summaryId)).status).toBe("DONE");
  });

  it("로그인하지 않으면 AUTH_401이다", async () => {
    const api = await loadApi();
    const summaryId = await doneSummaryId(api);

    expect(await codeOf(api.saveSummaryToRecords(summaryId))).toBe("AUTH_401");
  });

  it("아직 만드는 중인 요약지는 result가 null인 SUMMARY_409다", async () => {
    const api = await loadApi();
    await login(api);
    await api.agreeToRecordConsent();
    const summaryId = await generatingSummaryId(api);

    const error = await api.saveSummaryToRecords(summaryId).then(
      () => null,
      (e: unknown) => e as { code: string; result: unknown },
    );

    expect(error?.code).toBe("SUMMARY_409");
    expect(error?.result).toBeNull();
    expect(await codeOf(api.saveSummaryToRecords("없는-요약지"))).toBe(
      "SUMMARY_404",
    );
  });

  it("보관하면 기록이 생기고 요약지는 사라지며, 다시 보관하면 기록 ID와 함께 SUMMARY_409다", async () => {
    const api = await loadApi();
    const summaryId = await doneSummaryId(api);
    await login(api);
    await api.agreeToRecordConsent();

    const saved = await api.saveSummaryToRecords(summaryId);
    const info = await api.getMyInfo();

    expect(info.recordCount).toBe(4);
    expect(await codeOf(api.getSummary(summaryId))).toBe("SUMMARY_404");
    const error = await api.saveSummaryToRecords(summaryId).then(
      () => null,
      (e: unknown) => e as { code: string; result: unknown },
    );
    expect(error?.code).toBe("SUMMARY_409");
    expect(error?.result).toEqual({ medicalRecordId: saved.medicalRecordId });
    // 두 번째 보관은 기록을 늘리지 않는다
    expect((await api.getMyInfo()).recordCount).toBe(4);
  });
});

describe("가짜 기록 목록·상세·삭제", () => {
  it("최근 순으로 서버 subtitle과 함께 쪽 단위로 돌려준다", async () => {
    const api = await loadApi();
    await login(api);

    const first = await api.listRecords({ page: 0, size: 2 });
    const second = await api.listRecords({ page: 1, size: 2 });

    expect(first).toMatchObject({
      page: 0,
      size: 2,
      totalCount: 3,
      hasNext: true,
    });
    expect(first.records.map((record) => record.mainSymptom)).toEqual([
      "무릎 통증",
      "기침",
    ]);
    expect(first.records[0].subtitle).toBe("3일 전부터 · 붓기 있음");
    expect(second.hasNext).toBe(false);
    expect(second.records.map((record) => record.mainSymptom)).toEqual([
      "어지러움",
    ]);
  });

  it("범위를 벗어난 page·size는 400이다", async () => {
    const api = await loadApi();
    await login(api);

    expect(await codeOf(api.listRecords({ page: -1 }))).toBe("SUMMARY_400");
    expect(await codeOf(api.listRecords({ size: 51 }))).toBe("SUMMARY_400");
    expect(await codeOf(api.listRecords({ size: 0 }))).toBe("SUMMARY_400");
  });

  it("상세는 null과 []를 그대로 돌려주고 고쳐도 원본이 바뀌지 않는다", async () => {
    const api = await loadApi();
    await login(api);
    const detail = await api.getRecord(1);
    detail.summary.mainSymptom = "바뀜";

    expect(detail.summary.medications).toBeNull();
    expect(detail.summary.allergies).toEqual([]);
    expect((await api.getRecord(1)).summary.mainSymptom).toBe("어지러움");
  });

  it("삭제하면 목록·상세에서 사라지고 다시 지우면 SUMMARY_404다", async () => {
    const api = await loadApi();
    await login(api);

    await expect(api.deleteRecord(3)).resolves.toEqual({ medicalRecordId: 3 });

    expect(await codeOf(api.getRecord(3))).toBe("SUMMARY_404");
    expect(await codeOf(api.deleteRecord(3))).toBe("SUMMARY_404");
    expect((await api.listRecords()).totalCount).toBe(2);
  });

  it("기록을 모두 지워도 기록 저장 동의는 거두어지지 않는다", async () => {
    const api = await loadApi();
    await login(api);
    await api.agreeToRecordConsent();

    for (const id of [1, 2, 3]) await api.deleteRecord(id);

    const info = await api.getMyInfo();
    expect(info.recordCount).toBe(0);
    expect(info.consents.record.agreed).toBe(true);
  });
});

describe("가짜 보호자", () => {
  const valid = {
    relation: "DAUGHTER",
    phoneNumber: "01012345678",
    consentAgreed: true,
  } as const;

  it("등록하면 가운데를 가린 번호로 내 정보에 보이고 GUARDIAN 동의도 함께 저장된다", async () => {
    const api = await loadApi();
    await login(api);

    const saved = await api.saveGuardian(valid);
    const info = await api.getMyInfo();

    expect(saved.phoneNumber).toBe("010-****-5678");
    expect(info.guardian).toEqual({
      relation: "DAUGHTER",
      phoneNumber: "010-****-5678",
    });
    expect(info.consents.guardian).toMatchObject({
      agreed: true,
      policyVersion: "v1",
    });
    // 기록 저장 동의는 따로라서 바뀌지 않는다
    expect(info.consents.record.agreed).toBe(false);
  });

  it("다시 등록하면 덮어쓴다", async () => {
    const api = await loadApi();
    await login(api);
    const first = await api.saveGuardian(valid);

    const second = await api.saveGuardian({
      relation: "SON",
      phoneNumber: "0212345678",
      consentAgreed: true,
    });

    expect(second.guardianId).toBe(first.guardianId);
    expect((await api.getMyInfo()).guardian).toEqual({
      relation: "SON",
      phoneNumber: "021-***-5678",
    });
  });

  it("전화번호 형식·동의 없음은 칸별 이유가 있는 GUARDIAN_400이다", async () => {
    const api = await loadApi();
    await login(api);

    const error = await api
      .saveGuardian({
        relation: "DAUGHTER",
        phoneNumber: "123",
        consentAgreed: false,
      })
      .then(
        () => null,
        (e: unknown) => e as { code: string; result: unknown },
      );

    expect(error?.code).toBe("GUARDIAN_400");
    expect(error?.result).toEqual({
      errors: [
        { field: "phoneNumber", reason: "숫자 10~11자리여야 해요" },
        { field: "consentAgreed", reason: "동의에 체크해 주세요" },
      ],
    });
    expect((await api.getMyInfo()).guardian).toBeNull();
  });

  it("지우면 보호자와 GUARDIAN 동의가 함께 사라지고, 없는데 지우면 GUARDIAN_404다", async () => {
    const api = await loadApi();
    await login(api);
    await api.saveGuardian(valid);

    await api.deleteGuardian();
    const info = await api.getMyInfo();

    expect(info.guardian).toBeNull();
    expect(info.consents.guardian.agreed).toBe(false);
    expect(await codeOf(api.deleteGuardian())).toBe("GUARDIAN_404");
  });
});
