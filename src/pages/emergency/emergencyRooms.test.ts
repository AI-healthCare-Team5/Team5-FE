import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, INVALID_RESPONSE, NETWORK_ERROR } from "@/api/errors";
import {
  getEmergencyRooms,
  type Hospital,
  type HospitalSearchResult,
} from "@/api/hospitals";
import {
  findEmergencyRooms,
  formatEmergencyRoomMeta,
} from "@/pages/emergency/emergencyRooms";

vi.mock("@/api/hospitals", () => ({ getEmergencyRooms: vi.fn() }));

const location = { latitude: 37.6971, longitude: 127.8887 };

const room: Hospital = {
  hospitalId: 301,
  name: "OO병원 응급실",
  hospitalType: "11",
  hospitalTypeName: "종합병원",
  departments: [],
  distanceKm: 4.8,
  latitude: 37.7105,
  longitude: 127.9021,
  phoneNumber: "033-000-0000",
  address: "강원특별자치도 OO시 OO로 00",
  hasEmergencyRoom: true,
  today: null,
};

function result(hospitals: Hospital[]): HospitalSearchResult {
  return {
    radiusKm: 30,
    dataUpdatedAt: "2026-11-04T04:00:00+09:00",
    totalCount: hospitals.length,
    hospitals,
  };
}

beforeEach(() => {
  vi.mocked(getEmergencyRooms).mockReset();
});

describe("E01 가까운 응급실", () => {
  it("좌표로 기본 반경·개수의 응급실을 찾고 신호를 넘긴다", async () => {
    vi.mocked(getEmergencyRooms).mockResolvedValue(result([room]));
    const signal = new AbortController().signal;

    await expect(findEmergencyRooms(location, signal)).resolves.toEqual([room]);

    expect(getEmergencyRooms).toHaveBeenCalledWith(location, signal);
  });

  it("위치가 없으면 요청하지 않고 빈 목록이다", async () => {
    await expect(findEmergencyRooms(null)).resolves.toEqual([]);

    expect(getEmergencyRooms).not.toHaveBeenCalled();
  });

  it("0건이면 빈 목록이다", async () => {
    vi.mocked(getEmergencyRooms).mockResolvedValue(result([]));

    await expect(findEmergencyRooms(location)).resolves.toEqual([]);
  });

  it.each([
    ["HOSPITAL_400", new ApiError("HOSPITAL_400", "", 400)],
    ["HOSPITAL_500", new ApiError("HOSPITAL_500", "", 500)],
    ["네트워크 오류", new ApiError(NETWORK_ERROR, "", 0)],
    ["형식 오류", new ApiError(INVALID_RESPONSE, "", 200)],
  ])("%s이면 119 안내만 남도록 빈 목록이다", async (_name, error) => {
    vi.mocked(getEmergencyRooms).mockRejectedValue(error);

    await expect(findEmergencyRooms(location)).resolves.toEqual([]);
  });

  it("취소는 그대로 던진다", async () => {
    const abort = new DOMException("취소", "AbortError");
    vi.mocked(getEmergencyRooms).mockRejectedValue(abort);

    await expect(findEmergencyRooms(location)).rejects.toBe(abort);
  });

  it("ApiError가 아닌 오류는 그대로 던진다", async () => {
    const bug = new TypeError("개발자 실수");
    vi.mocked(getEmergencyRooms).mockRejectedValue(bug);

    await expect(findEmergencyRooms(location)).rejects.toBe(bug);
  });
});

describe("응급실 거리와 진료 시간 줄", () => {
  const today = {
    isOpen: true,
    is24Hours: true,
    openTime: "00:00",
    closeTime: "23:59",
    nextOpenAt: null,
  };

  it("24시간이면 거리 뒤에 24시간을 붙인다", () => {
    expect(formatEmergencyRoomMeta({ distanceKm: 4.8, today })).toBe(
      "4.8km · 24시간",
    );
  });

  it("거리는 소수 1자리로 적는다", () => {
    expect(formatEmergencyRoomMeta({ distanceKm: 12, today })).toBe(
      "12.0km · 24시간",
    );
  });

  it.each([
    ["24시간이 아님", { ...today, is24Hours: false }],
    ["진료 시간 정보 없음", null],
  ])("%s이면 거리만 적는다", (_name, value) => {
    expect(formatEmergencyRoomMeta({ distanceKm: 6.2, today: value })).toBe(
      "6.2km",
    );
  });
});
