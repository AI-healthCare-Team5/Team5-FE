import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestCurrentPosition } from "@/components/map/currentPosition";
import { appActions, getAppState } from "@/stores/appStore";

vi.mock("@/components/map/currentPosition", () => ({
  requestCurrentPosition: vi.fn(),
}));

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
  return (value: typeof location | null) => {
    settle(value);
    return Promise.resolve();
  };
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

describe("현재 위치 한 번 묻기", () => {
  it("묻는 동안 asking이고 허용하면 좌표를 기억한다", async () => {
    const settle = deferPosition();

    appActions.askCurrentLocationOnce();
    expect(getAppState().currentLocation).toEqual({ status: "asking" });

    await settle(location);

    expect(getAppState().currentLocation).toEqual({
      status: "found",
      location,
    });
  });

  it("거부하거나 받지 못하면 unavailable이고 다시 묻지 않는다", async () => {
    const settle = deferPosition();

    appActions.askCurrentLocationOnce();
    await settle(null);
    appActions.askCurrentLocationOnce();

    expect(getAppState().currentLocation).toEqual({ status: "unavailable" });
    expect(requestCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("묻는 중에 다시 불러도 한 번만 묻는다", () => {
    deferPosition();

    appActions.askCurrentLocationOnce();
    appActions.askCurrentLocationOnce();

    expect(requestCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("좌표를 받은 뒤에는 다시 묻지 않는다", async () => {
    const settle = deferPosition();

    appActions.askCurrentLocationOnce();
    await settle(location);
    appActions.askCurrentLocationOnce();

    expect(requestCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("묻는 동안 새 문진을 시작하면 늦게 온 결과를 쓰지 않고 다시 물을 수 있다", async () => {
    const settle = deferPosition();

    appActions.askCurrentLocationOnce();
    appActions.startInterview();
    await settle(location);

    expect(getAppState().currentLocation).toEqual({ status: "unasked" });
  });
});
