import { afterEach, describe, expect, it, vi } from "vitest";

// isMockApi는 모듈을 불러올 때 정해지므로 테스트마다 환경 변수를 정하고 모듈을 새로 불러옵니다.
async function load(mock: boolean) {
  vi.resetModules();
  if (mock) vi.stubEnv("VITE_API_MOCK", "true");
  const position =
    vi.fn<() => Promise<{ latitude: number; longitude: number } | null>>();
  vi.doMock("@/components/map/currentPosition", () => ({
    requestCurrentPosition: position,
  }));
  const module = await import("@/pages/hospitals/searchLocation");
  return { ...module, position };
}

afterEach(() => {
  vi.doUnmock("@/components/map/currentPosition");
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("병원 찾을 위치 정하기", () => {
  it("주소에 지역 코드가 있으면 위치를 묻지 않고 그 지역으로 찾는다", async () => {
    const api = await load(false);

    await expect(
      api.resolveSearchLocation({ regionCode: "51720" }),
    ).resolves.toEqual({ params: { regionCode: "51720" }, point: null });
    expect(api.position).not.toHaveBeenCalled();
  });

  it("지역 코드가 없으면 브라우저의 현재 위치로 찾고 지도에도 표시한다", async () => {
    const api = await load(false);
    api.position.mockResolvedValue({ latitude: 37.5, longitude: 127.5 });

    await expect(api.resolveSearchLocation({})).resolves.toEqual({
      params: { latitude: 37.5, longitude: 127.5 },
      point: { latitude: 37.5, longitude: 127.5 },
    });
    expect(api.position).toHaveBeenCalledTimes(1);
  });

  it("위치 권한을 거부했거나 측정에 실패하면 null이다", async () => {
    const api = await load(false);
    api.position.mockResolvedValue(null);

    await expect(api.resolveSearchLocation({ radius: 30 })).resolves.toBeNull();
  });

  it("돌려준 위치에는 정확도 같은 다른 값이 섞이지 않는다", async () => {
    const api = await load(false);
    api.position.mockResolvedValue({
      latitude: 37.5,
      longitude: 127.5,
      accuracy: 5,
    } as unknown as { latitude: number; longitude: number });

    const location = await api.resolveSearchLocation({});

    expect(Object.keys(location?.params ?? {}).sort()).toEqual([
      "latitude",
      "longitude",
    ]);
    expect(Object.keys(location?.point ?? {}).sort()).toEqual([
      "latitude",
      "longitude",
    ]);
  });

  it("가짜 응답에서는 권한을 묻지 않고 가짜 위치를 쓴다", async () => {
    const api = await load(true);

    const location = await api.resolveSearchLocation({});

    expect(location?.params).toEqual({ latitude: 37.697, longitude: 127.889 });
    expect(location?.point).toEqual({ latitude: 37.697, longitude: 127.889 });
    expect(api.position).not.toHaveBeenCalled();
  });

  it("가짜 응답이어도 지역 코드가 있으면 그 지역으로 찾는다", async () => {
    const api = await load(true);

    await expect(
      api.resolveSearchLocation({ regionCode: "51150" }),
    ).resolves.toEqual({ params: { regionCode: "51150" }, point: null });
  });
});
