import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentPositionMaximumAgeMs,
  requestCurrentPosition,
} from "@/components/map/currentPosition";

type GetCurrentPosition = Geolocation["getCurrentPosition"];

function stubGeolocation(getCurrentPosition: GetCurrentPosition) {
  const mock = vi.fn(getCurrentPosition);
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: mock } });
  return mock;
}

function position(latitude: number, longitude: number) {
  return { coords: { latitude, longitude } } as GeolocationPosition;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("현재 위치 묻기", () => {
  it("허용하면 위도와 경도만 돌려준다", async () => {
    const getCurrentPosition = stubGeolocation((success) =>
      success(position(37.6971, 127.8887)),
    );

    await expect(requestCurrentPosition(5000)).resolves.toEqual({
      latitude: 37.6971,
      longitude: 127.8887,
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition.mock.calls[0][2]).toEqual({
      timeout: 5000,
      maximumAge: currentPositionMaximumAgeMs,
    });
  });

  it("거부하거나 측정에 실패하면 null이다", async () => {
    stubGeolocation((_success, error) =>
      error?.({ code: 1 } as GeolocationPositionError),
    );

    await expect(requestCurrentPosition()).resolves.toBeNull();
  });

  it("위치 기능이 없으면 묻지 않고 null이다", async () => {
    vi.stubGlobal("navigator", {});

    await expect(requestCurrentPosition()).resolves.toBeNull();
  });

  it("묻는 중에 예외가 나도 null이다", async () => {
    stubGeolocation(() => {
      throw new Error("보안 컨텍스트가 아니에요");
    });

    await expect(requestCurrentPosition()).resolves.toBeNull();
  });
});
