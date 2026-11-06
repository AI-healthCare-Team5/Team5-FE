import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR, SERVER_ERROR_MESSAGE } from "@/api/errors";
import { getRegions, type Region } from "@/api/regions";
import {
  DEFAULT_REGION_NAME,
  loadRegions,
  selectedRegion,
} from "@/pages/region/regionChoice";

vi.mock("@/api/regions", () => ({ getRegions: vi.fn() }));

// 실제 백엔드가 아니라 API 함수를 가짜로 바꿔 응답별 처리를 확인합니다. 모든 값은 가짜 데이터입니다.
const getRegionsMock = vi.mocked(getRegions);

const regions: Region[] = [
  {
    regionCode: "51150",
    regionName: "강릉시",
    centerLatitude: 37.752,
    centerLongitude: 128.876,
  },
  {
    regionCode: "51720",
    regionName: "홍천군",
    centerLatitude: 37.697,
    centerLongitude: 127.889,
  },
];

beforeEach(() => {
  getRegionsMock.mockReset();
});

describe("selectedRegion", () => {
  it("고르지 않았으면 기본 시·군(홍천군)이다", () => {
    expect(DEFAULT_REGION_NAME).toBe("홍천군");
    expect(selectedRegion(regions, null)?.regionCode).toBe("51720");
  });

  it("고른 시·군이 있으면 그것이다", () => {
    expect(selectedRegion(regions, "51150")?.regionName).toBe("강릉시");
  });

  it("고른 코드가 목록에 없으면 기본 시·군으로 돌아간다", () => {
    expect(selectedRegion(regions, "99999")?.regionName).toBe("홍천군");
  });

  it("목록이 없거나 기본 시·군이 없으면 고르지 않은 상태다", () => {
    expect(selectedRegion([], null)).toBeNull();
    expect(selectedRegion([regions[0]], null)).toBeNull();
  });
});

describe("loadRegions", () => {
  it("받은 목록을 돌려준다", async () => {
    getRegionsMock.mockResolvedValue({ regions });

    await expect(loadRegions()).resolves.toEqual({ kind: "loaded", regions });
  });

  it("받지 못하면 안내 문장과 함께 실패를 돌려준다", async () => {
    getRegionsMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));

    await expect(loadRegions()).resolves.toEqual({
      kind: "failed",
      message: SERVER_ERROR_MESSAGE,
    });
  });

  it("코드 실수는 그대로 던진다", async () => {
    getRegionsMock.mockRejectedValue(new TypeError("oops"));

    await expect(loadRegions()).rejects.toThrow(TypeError);
  });
});
