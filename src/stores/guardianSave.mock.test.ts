import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 가짜 API(VITE_API_MOCK=true)를 실제로 거쳐 저장 결과가 store까지 반영되는지 확인합니다.
// 실제 백엔드 연동 검증이 아닙니다. 모든 값은 가짜 샘플입니다.
async function loadModules() {
  vi.resetModules();
  vi.stubEnv("VITE_API_MOCK", "true");
  const [auth, members, session, store] = await Promise.all([
    import("@/api/auth"),
    import("@/api/members"),
    import("@/stores/memberSession"),
    import("@/stores/appStore"),
  ]);
  await auth.loginWithKakao({ code: "c", state: "s", redirectUri: "r" });
  store.appActions.applyMember(await members.getMyInfo());
  return { ...session, ...store, getMyInfo: members.getMyInfo };
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("보호자 저장(가짜 API)", () => {
  it("등록하면 가린 번호와 동의가 store와 내 정보 응답에 반영된다", async () => {
    const api = await loadModules();

    await expect(
      api.saveGuardianContact({
        relation: "DAUGHTER",
        phoneNumber: "010-0000-5678",
        consentAgreed: true,
      }),
    ).resolves.toEqual({ kind: "saved" });

    expect(api.getAppState()).toMatchObject({
      guardian: { relation: "DAUGHTER", phoneNumber: "010-****-5678" },
      guardianConsent: true,
    });
    expect((await api.getMyInfo()).guardian).toEqual({
      relation: "DAUGHTER",
      phoneNumber: "010-****-5678",
    });
  });

  it("바꾸면 새 응답 값으로 덮어쓰고, 지우기와 충돌하지 않는다", async () => {
    const api = await loadModules();
    const base = { consentAgreed: true } as const;
    await api.saveGuardianContact({
      ...base,
      relation: "SON",
      phoneNumber: "01000001111",
    });
    await api.saveGuardianContact({
      ...base,
      relation: "SPOUSE",
      phoneNumber: "01000002222",
    });

    expect(api.getAppState().guardian).toEqual({
      relation: "SPOUSE",
      phoneNumber: "010-****-2222",
    });

    await expect(api.removeGuardianContact()).resolves.toEqual({
      kind: "removed",
    });
    expect(api.getAppState()).toMatchObject({
      guardian: null,
      guardianConsent: false,
    });
  });

  it("서버가 마스킹해 준 번호를 그대로 다시 보내면 GUARDIAN_400이고 store는 그대로다", async () => {
    const api = await loadModules();

    await expect(
      api.saveGuardianContact({
        relation: "SON",
        phoneNumber: "010-****-5678",
        consentAgreed: true,
      }),
    ).resolves.toMatchObject({
      kind: "invalid",
      fieldErrors: [{ field: "phoneNumber" }],
    });
    expect(api.getAppState().guardian).toBeNull();
  });
});
