import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR } from "@/api/errors";
import { getNearestHealthCenter, type Hospital } from "@/api/hospitals";
import { loadNearestHealthCenter } from "@/pages/hospitals/healthCenter";
import { resolveSearchLocation } from "@/pages/hospitals/searchLocation";

vi.mock("@/api/hospitals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/hospitals")>()),
  getNearestHealthCenter: vi.fn(),
}));
vi.mock("@/pages/hospitals/searchLocation", () => ({
  resolveSearchLocation: vi.fn(),
}));

// 모든 값은 가짜 데이터입니다.
const centerMock = vi.mocked(getNearestHealthCenter);
const locationMock = vi.mocked(resolveSearchLocation);

const center: Hospital = {
  hospitalId: 201,
  name: "OO보건소",
  hospitalType: "71",
  hospitalTypeName: "보건소",
  departments: [],
  distanceKm: 6.3,
  latitude: 37.69,
  longitude: 127.88,
  phoneNumber: "000-0000-0000",
  address: "강원특별자치도 OO시 OO로 00",
  hasEmergencyRoom: false,
  today: null,
};

beforeEach(() => {
  centerMock.mockReset();
  locationMock.mockReset();
  locationMock.mockResolvedValue({
    params: { latitude: 37.5, longitude: 127.5 },
    point: { latitude: 37.5, longitude: 127.5 },
  });
});

describe("가까운 보건소 찾기", () => {
  it("찾은 위치 조건으로 가장 가까운 보건소를 돌려준다", async () => {
    centerMock.mockResolvedValue({
      dataUpdatedAt: "2026-11-04T04:00:00+09:00",
      hospital: center,
    });
    const controller = new AbortController();

    await expect(
      loadNearestHealthCenter({ radius: 30 }, controller.signal),
    ).resolves.toEqual(center);

    expect(locationMock).toHaveBeenCalledWith({ radius: 30 });
    expect(centerMock).toHaveBeenCalledTimes(1);
    expect(centerMock.mock.calls[0][0]).toEqual({
      latitude: 37.5,
      longitude: 127.5,
    });
    expect(centerMock.mock.calls[0][1]).toBe(controller.signal);
  });

  it("지역으로 찾을 때는 지역 코드를 넘긴다", async () => {
    locationMock.mockResolvedValue({
      params: { regionCode: "51720" },
      point: null,
    });
    centerMock.mockResolvedValue({
      dataUpdatedAt: "2026-11-04T04:00:00+09:00",
      hospital: center,
    });

    await loadNearestHealthCenter({ regionCode: "51720" });

    expect(centerMock.mock.calls[0][0]).toEqual({ regionCode: "51720" });
  });

  it("보건소가 없으면 null이다", async () => {
    centerMock.mockResolvedValue({
      dataUpdatedAt: "2026-11-04T04:00:00+09:00",
      hospital: null,
    });

    await expect(loadNearestHealthCenter({})).resolves.toBeNull();
  });

  it("위치를 얻지 못하면 요청하지 않고 null이다", async () => {
    locationMock.mockResolvedValue(null);

    await expect(loadNearestHealthCenter({})).resolves.toBeNull();
    expect(centerMock).not.toHaveBeenCalled();
  });

  it.each([
    ["HOSPITAL_500", 500],
    ["HOSPITAL_400", 400],
    [NETWORK_ERROR, 0],
  ])(
    "%s 같은 API 오류는 카드를 그리지 않도록 null이다",
    async (code, status) => {
      centerMock.mockRejectedValue(new ApiError(code, "", status));

      await expect(loadNearestHealthCenter({})).resolves.toBeNull();
    },
  );

  it("API 오류가 아닌 예외(코드 실수)는 숨기지 않고 던진다", async () => {
    centerMock.mockRejectedValue(new TypeError("개발자 실수"));

    await expect(loadNearestHealthCenter({})).rejects.toThrow("개발자 실수");
  });

  it("화면을 떠난 뒤에 도착한 응답은 쓰지 않는다", async () => {
    const controller = new AbortController();
    centerMock.mockImplementation(async () => {
      controller.abort();
      return { dataUpdatedAt: "2026-11-04T04:00:00+09:00", hospital: center };
    });

    await expect(
      loadNearestHealthCenter({}, controller.signal),
    ).resolves.toBeNull();
  });

  it("취소 때문에 생긴 오류는 던지지 않고 null이다", async () => {
    const controller = new AbortController();
    centerMock.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("aborted", "AbortError");
    });

    await expect(
      loadNearestHealthCenter({}, controller.signal),
    ).resolves.toBeNull();
  });

  it("위치를 정하는 동안 화면을 떠나면 요청하지 않는다", async () => {
    const controller = new AbortController();
    locationMock.mockImplementation(async () => {
      controller.abort();
      return {
        params: { latitude: 37.5, longitude: 127.5 },
        point: { latitude: 37.5, longitude: 127.5 },
      };
    });

    await expect(
      loadNearestHealthCenter({}, controller.signal),
    ).resolves.toBeNull();
    expect(centerMock).not.toHaveBeenCalled();
  });
});
