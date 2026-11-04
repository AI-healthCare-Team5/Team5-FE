import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadKakaoMaps,
  type KakaoGeocoderResult,
  type KakaoMapsApi,
} from "@/components/map/kakaoMapLoader";
import { pickAddress, reverseGeocode } from "@/components/map/reverseGeocode";

vi.mock("@/components/map/kakaoMapLoader", () => ({
  loadKakaoMaps: vi.fn(),
}));

const OK = "OK";
const ZERO_RESULT = "ZERO_RESULT";
const ERROR = "ERROR";

const roadAndLot: KakaoGeocoderResult = {
  road_address: { address_name: "강원특별자치도 OO시 OO로 00" },
  address: { address_name: "강원특별자치도 OO시 OO동 00" },
};
const lotOnly: KakaoGeocoderResult = {
  road_address: null,
  address: { address_name: "강원특별자치도 OO시 OO동 00" },
};

type Coord2Address = (
  longitude: number,
  latitude: number,
  callback: (results: KakaoGeocoderResult[], status: string) => void,
) => void;

function fakeMaps(coord2Address: Coord2Address) {
  class Geocoder {
    coord2Address = coord2Address;
  }
  return {
    services: { Geocoder, Status: { OK, ZERO_RESULT, ERROR } },
  } as unknown as KakaoMapsApi;
}

function respondWith(results: KakaoGeocoderResult[], status = OK) {
  const coord2Address = vi.fn<Coord2Address>((_lng, _lat, callback) =>
    callback(results, status),
  );
  vi.mocked(loadKakaoMaps).mockResolvedValue(fakeMaps(coord2Address));
  return coord2Address;
}

describe("주소 고르기", () => {
  it("도로명 주소를 지번 주소보다 먼저 쓴다", () => {
    expect(pickAddress([roadAndLot])).toBe("강원특별자치도 OO시 OO로 00");
  });

  it("도로명 주소가 없으면 지번 주소를 쓴다", () => {
    expect(pickAddress([lotOnly])).toBe("강원특별자치도 OO시 OO동 00");
  });

  it("도로명 주소가 빈 글자면 지번 주소를 쓴다", () => {
    expect(
      pickAddress([{ ...lotOnly, road_address: { address_name: " " } }]),
    ).toBe("강원특별자치도 OO시 OO동 00");
  });

  it("주소가 하나도 없으면 null이다", () => {
    expect(pickAddress([])).toBeNull();
    expect(pickAddress([{ road_address: null, address: null }])).toBeNull();
  });
});

describe("좌표를 주소로 바꾸기", () => {
  beforeEach(() => {
    vi.mocked(loadKakaoMaps).mockReset();
    vi.stubEnv("VITE_KAKAO_MAP_APP_KEY", "key");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("경도, 위도 순서로 요청하고 주소를 돌려준다", async () => {
    const coord2Address = respondWith([roadAndLot]);

    await expect(reverseGeocode(37.6971, 127.8887)).resolves.toBe(
      "강원특별자치도 OO시 OO로 00",
    );

    expect(loadKakaoMaps).toHaveBeenCalledWith("key");
    expect(coord2Address).toHaveBeenCalledTimes(1);
    const [first, second] = coord2Address.mock.calls[0];
    expect(first).toBe(127.8887);
    expect(second).toBe(37.6971);
  });

  it("앱 키가 없으면 SDK를 부르지 않고 null이다", async () => {
    vi.stubEnv("VITE_KAKAO_MAP_APP_KEY", "");

    await expect(reverseGeocode(37.6971, 127.8887)).resolves.toBeNull();

    expect(loadKakaoMaps).not.toHaveBeenCalled();
  });

  it("SDK 로드에 실패하면 null이다", async () => {
    vi.mocked(loadKakaoMaps).mockRejectedValue(new Error("로드 실패"));

    await expect(reverseGeocode(37.6971, 127.8887)).resolves.toBeNull();
  });

  it.each([
    ["ZERO_RESULT", ZERO_RESULT],
    ["ERROR", ERROR],
  ])("상태가 %s이면 null이다", async (_name, status) => {
    respondWith([roadAndLot], status);

    await expect(reverseGeocode(37.6971, 127.8887)).resolves.toBeNull();
  });

  it("결과가 비어 있으면 null이다", async () => {
    respondWith([]);

    await expect(reverseGeocode(37.6971, 127.8887)).resolves.toBeNull();
  });

  it("services 라이브러리가 없으면 null이다", async () => {
    vi.mocked(loadKakaoMaps).mockResolvedValue({} as KakaoMapsApi);

    await expect(reverseGeocode(37.6971, 127.8887)).resolves.toBeNull();
  });

  it("요청 중 예외가 나도 null이고 타이머를 남기지 않는다", async () => {
    vi.useFakeTimers();
    vi.mocked(loadKakaoMaps).mockResolvedValue(
      fakeMaps(() => {
        throw new Error("요청 실패");
      }),
    );

    await expect(reverseGeocode(37.6971, 127.8887)).resolves.toBeNull();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("콜백이 오지 않으면 제한 시간 뒤 null이다", async () => {
    vi.useFakeTimers();
    vi.mocked(loadKakaoMaps).mockResolvedValue(fakeMaps(() => {}));
    let settled = false;

    const promise = reverseGeocode(37.6971, 127.8887, 1000);
    void promise.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBeNull();
  });

  it("서버로 요청하지 않고 위치 권한도 요청하지 않는다", async () => {
    const fetchMock = vi.fn();
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    respondWith([roadAndLot]);

    await reverseGeocode(37.6971, 127.8887);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
