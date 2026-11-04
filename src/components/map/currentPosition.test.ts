import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentPositionMaximumAgeMs,
  getGeolocationPermission,
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

describe("위치 권한 상태", () => {
  function stubPermissions(query: Permissions["query"] | undefined) {
    vi.stubGlobal("navigator", {
      permissions: query ? { query: vi.fn(query) } : undefined,
    });
  }

  it.each(["granted", "prompt", "denied"] as const)(
    "권한이 %s이면 그대로 돌려주고 위치는 묻지 않는다",
    async (state) => {
      const getCurrentPosition = vi.fn();
      vi.stubGlobal("navigator", {
        geolocation: { getCurrentPosition },
        permissions: {
          query: vi.fn(async () => ({ state }) as PermissionStatus),
        },
      });

      await expect(getGeolocationPermission()).resolves.toBe(state);
      expect(getCurrentPosition).not.toHaveBeenCalled();
    },
  );

  it("geolocation 이름으로 조회한다", async () => {
    const query = vi.fn(async () => ({ state: "prompt" }) as PermissionStatus);
    vi.stubGlobal("navigator", { permissions: { query } });

    await getGeolocationPermission();

    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
  });

  it("Permissions API가 없으면 unknown이다", async () => {
    stubPermissions(undefined);

    await expect(getGeolocationPermission()).resolves.toBe("unknown");
  });

  it("조회가 거절되거나 예외를 던지면 unknown이다", async () => {
    stubPermissions(async () => {
      throw new TypeError("geolocation 조회를 지원하지 않아요");
    });
    await expect(getGeolocationPermission()).resolves.toBe("unknown");

    stubPermissions(() => {
      throw new TypeError("동기 예외");
    });
    await expect(getGeolocationPermission()).resolves.toBe("unknown");
  });

  it("알 수 없는 상태 값이면 unknown이다", async () => {
    stubPermissions(
      async () => ({ state: "other" }) as unknown as PermissionStatus,
    );

    await expect(getGeolocationPermission()).resolves.toBe("unknown");
  });
});
