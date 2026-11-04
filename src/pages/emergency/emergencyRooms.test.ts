import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, INVALID_RESPONSE, NETWORK_ERROR } from "@/api/errors";
import {
  getEmergencyRooms,
  type Hospital,
  type HospitalSearchResult,
} from "@/api/hospitals";
import {
  getGeolocationPermission,
  requestCurrentPosition,
} from "@/components/map/currentPosition";
import {
  findEmergencyRooms,
  formatEmergencyRoomMeta,
  locateWithoutPrompt,
} from "@/pages/emergency/emergencyRooms";
import { appActions, getAppState } from "@/stores/appStore";

vi.mock("@/api/hospitals", () => ({ getEmergencyRooms: vi.fn() }));
vi.mock("@/components/map/currentPosition", () => ({
  getGeolocationPermission: vi.fn(),
  requestCurrentPosition: vi.fn(),
}));

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
  vi.mocked(getGeolocationPermission).mockReset();
  vi.mocked(requestCurrentPosition).mockReset();
  appActions.startInterview();
});

describe("E01에 들어올 때 위치 정하기", () => {
  it("권한이 이미 허용돼 있으면 조용히 위치를 받아 기억한다", async () => {
    vi.mocked(getGeolocationPermission).mockResolvedValue("granted");
    vi.mocked(requestCurrentPosition).mockResolvedValue(location);

    await expect(locateWithoutPrompt()).resolves.toEqual(location);

    expect(getAppState().currentLocation).toEqual(location);
  });

  it.each(["prompt", "denied", "unknown"] as const)(
    "권한이 %s이면 권한 창을 띄우지 않고(위치를 묻지 않고) null이다",
    async (permission) => {
      vi.mocked(getGeolocationPermission).mockResolvedValue(permission);

      await expect(locateWithoutPrompt()).resolves.toBeNull();

      expect(requestCurrentPosition).not.toHaveBeenCalled();
    },
  );

  it("이미 받은 위치가 있으면 권한도 위치도 다시 묻지 않는다", async () => {
    vi.mocked(requestCurrentPosition).mockResolvedValueOnce(location);
    await appActions.requestCurrentLocation();
    vi.mocked(requestCurrentPosition).mockClear();

    await expect(locateWithoutPrompt()).resolves.toEqual(location);

    expect(getGeolocationPermission).not.toHaveBeenCalled();
    expect(requestCurrentPosition).not.toHaveBeenCalled();
  });

  it("허용돼 있어도 측정에 실패하면 null이고 기억하지 않는다", async () => {
    vi.mocked(getGeolocationPermission).mockResolvedValue("granted");
    vi.mocked(requestCurrentPosition).mockResolvedValue(null);

    await expect(locateWithoutPrompt()).resolves.toBeNull();

    expect(getAppState().currentLocation).toBeNull();
  });
});

describe("E01 가까운 응급실", () => {
  it("좌표로 기본 반경·개수의 응급실을 찾고, 갱신일 안내에 쓰도록 응답을 그대로 돌려준다", async () => {
    vi.mocked(getEmergencyRooms).mockResolvedValue(result([room]));
    const signal = new AbortController().signal;

    await expect(findEmergencyRooms(location, signal)).resolves.toEqual(
      result([room]),
    );

    expect(getEmergencyRooms).toHaveBeenCalledWith(location, signal);
  });

  it("0건이면 빈 목록의 응답이다", async () => {
    vi.mocked(getEmergencyRooms).mockResolvedValue(result([]));

    await expect(findEmergencyRooms(location)).resolves.toMatchObject({
      hospitals: [],
    });
  });

  it.each([
    ["HOSPITAL_400", new ApiError("HOSPITAL_400", "", 400)],
    ["HOSPITAL_500", new ApiError("HOSPITAL_500", "", 500)],
    ["네트워크 오류", new ApiError(NETWORK_ERROR, "", 0)],
    ["형식 오류", new ApiError(INVALID_RESPONSE, "", 200)],
  ])("%s이면 119 안내만 남도록 null이다", async (_name, error) => {
    vi.mocked(getEmergencyRooms).mockRejectedValue(error);

    await expect(findEmergencyRooms(location)).resolves.toBeNull();
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
