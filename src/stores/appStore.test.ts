import { afterEach, describe, expect, it, vi } from "vitest";

// 모든 값은 가짜 데이터입니다.
// isMockApi는 모듈을 불러올 때 정해지므로 테스트마다 환경 변수를 정하고 모듈을 새로 불러옵니다.
async function load(mock: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_API_MOCK", mock ? "true" : "false");
  const [{ appActions, getAppState }, { sampleSummary }] = await Promise.all([
    import("@/stores/appStore"),
    import("@/stores/fixtures"),
  ]);
  return { appActions, getAppState, sampleSummary };
}

function logInWithConsent(
  appActions: Awaited<ReturnType<typeof load>>["appActions"],
) {
  appActions.completeLogin(
    { nickname: "봄날", needsRecordConsent: false },
    { returnTo: "/summary", saveTarget: null },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("요약지 보관", () => {
  it("실제 경로에서는 로그인하고 동의해도 보관하지 않고 저장 성공을 켜지 않는다", async () => {
    const { appActions, getAppState, sampleSummary } = await load(false);
    logInWithConsent(appActions);

    appActions.saveSummary(sampleSummary);

    expect(getAppState().summarySaved).toBe(false);
    expect(getAppState().records).toEqual([]);
  });

  it("실제 경로에서 로그인해도 예시 기록을 넣지 않는다", async () => {
    const { appActions, getAppState } = await load(false);

    logInWithConsent(appActions);

    expect(getAppState().loggedIn).toBe(true);
    expect(getAppState().records).toEqual([]);
  });

  it("목 모드에서는 로그인하고 동의하면 요약지를 보관하고 한 번만 보관한다", async () => {
    const { appActions, getAppState, sampleSummary } = await load(true);
    logInWithConsent(appActions);
    const before = getAppState().records.length;

    appActions.saveSummary(sampleSummary);
    appActions.saveSummary(sampleSummary);

    expect(getAppState().summarySaved).toBe(true);
    expect(getAppState().records).toHaveLength(before + 1);
    expect(getAppState().records[0].summary).toEqual(sampleSummary);
  });

  it("목 모드여도 로그인하지 않았거나 동의하지 않았으면 보관하지 않는다", async () => {
    const { appActions, getAppState, sampleSummary } = await load(true);

    appActions.saveSummary(sampleSummary);
    expect(getAppState().summarySaved).toBe(false);

    appActions.completeLogin(
      { nickname: "봄날", needsRecordConsent: true },
      { returnTo: "/summary", saveTarget: null },
    );
    appActions.saveSummary(sampleSummary);
    expect(getAppState().summarySaved).toBe(false);
  });
});
