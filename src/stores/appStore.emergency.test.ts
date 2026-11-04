import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestCurrentPosition } from "@/components/map/currentPosition";
import { appActions, getAppState } from "@/stores/appStore";

vi.mock("@/components/map/currentPosition", () => ({
  requestCurrentPosition: vi.fn(),
}));

// 모든 값은 가짜 데이터입니다.
const location = { latitude: 37.6971, longitude: 127.8887 };
const entry = {
  intakeId: "3f2a9c1e-0000-4000-8000-000000000001",
  userUtterance: "가슴이 답답해요",
};

// 위치 요청을 테스트가 원하는 때에 끝낼 수 있게 합니다.
function deferPosition() {
  let settle: (value: typeof location | null) => void = () => {};
  vi.mocked(requestCurrentPosition).mockReturnValueOnce(
    new Promise((resolve) => {
      settle = resolve;
    }),
  );
  return settle;
}

function logIn() {
  appActions.completeLogin(
    { nickname: "봄날", needsRecordConsent: false },
    { returnTo: "/", saveTarget: null },
  );
}

beforeEach(() => {
  vi.mocked(requestCurrentPosition).mockReset();
  appActions.startInterview();
});

describe("응급 전환 상태", () => {
  it("응급 전환 정보를 기억하고 새 문진을 시작하면 지운다", () => {
    appActions.enterEmergency(entry);
    expect(getAppState().emergency).toEqual(entry);

    appActions.startInterview();

    expect(getAppState().emergency).toBeNull();
  });
});

describe("현재 위치 요청", () => {
  it("받은 위치를 기억하고 돌려준다", async () => {
    vi.mocked(requestCurrentPosition).mockResolvedValueOnce(location);

    await expect(appActions.requestCurrentLocation()).resolves.toEqual(
      location,
    );

    expect(getAppState().currentLocation).toEqual(location);
  });

  it("기억한 위치가 있으면 다시 묻지 않는다(다시 들어와도 권한 창이 뜨지 않는다)", async () => {
    vi.mocked(requestCurrentPosition).mockResolvedValueOnce(location);
    await appActions.requestCurrentLocation();

    await expect(appActions.requestCurrentLocation()).resolves.toEqual(
      location,
    );

    expect(requestCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("묻는 중에 다시 불러도(StrictMode, 두 번 누름) 한 번만 묻고 같은 결과를 받는다", async () => {
    const settle = deferPosition();

    const first = appActions.requestCurrentLocation();
    const second = appActions.requestCurrentLocation();
    settle(location);

    await expect(first).resolves.toEqual(location);
    await expect(second).resolves.toEqual(location);
    expect(requestCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("거부하거나 받지 못하면 기억하지 않고, 다시 누르면 다시 묻는다", async () => {
    vi.mocked(requestCurrentPosition).mockResolvedValueOnce(null);
    vi.mocked(requestCurrentPosition).mockResolvedValueOnce(location);

    await expect(appActions.requestCurrentLocation()).resolves.toBeNull();
    expect(getAppState().currentLocation).toBeNull();

    await expect(appActions.requestCurrentLocation()).resolves.toEqual(
      location,
    );
    expect(requestCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("묻는 동안 새 문진을 시작하면 늦게 온 위치를 쓰지 않는다", async () => {
    const settle = deferPosition();

    const asking = appActions.requestCurrentLocation();
    appActions.startInterview();
    settle(location);

    await expect(asking).resolves.toBeNull();
    expect(getAppState().currentLocation).toBeNull();
  });
});

describe("로그아웃·탈퇴", () => {
  it.each([
    ["로그아웃", () => appActions.logout()],
    ["탈퇴", () => appActions.withdraw()],
  ])("%s하면 말씀하신 내용과 위치를 지운다", async (_name, leave) => {
    logIn();
    vi.mocked(requestCurrentPosition).mockResolvedValueOnce(location);
    appActions.enterEmergency(entry);
    await appActions.requestCurrentLocation();

    leave();

    expect(getAppState().emergency).toBeNull();
    expect(getAppState().currentLocation).toBeNull();
  });

  it.each([
    ["로그아웃", () => appActions.logout()],
    ["탈퇴", () => appActions.withdraw()],
  ])(
    "위치를 묻는 중에 %s하면 늦게 온 위치를 기억하지 않는다",
    async (_name, leave) => {
      logIn();
      const settle = deferPosition();
      const asking = appActions.requestCurrentLocation();

      leave();
      settle(location);

      await expect(asking).resolves.toBeNull();
      expect(getAppState().currentLocation).toBeNull();
    },
  );
});
