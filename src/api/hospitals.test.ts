import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, INVALID_RESPONSE, NETWORK_ERROR } from "@/api/errors";
import {
  getEmergencyRooms,
  getNearestHealthCenter,
  isLocationRequiredError,
  searchHospitals,
  type Hospital,
  type HospitalSearchResult,
} from "@/api/hospitals";

// 모든 값은 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

function envelope(
  status: number,
  body: {
    isSuccess: boolean;
    code: string;
    message?: string;
    result?: unknown;
  },
) {
  return new Response(JSON.stringify({ message: "", result: null, ...body }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ok = (result: unknown) =>
  envelope(200, { isSuccess: true, code: "HOSPITAL_200", result });
const fail = (status: number, code: string, result: unknown = null) =>
  envelope(status, { isSuccess: false, code, message: "안내 문장", result });

const hospital: Hospital = {
  hospitalId: 101,
  name: "OO정형외과의원",
  hospitalType: "31",
  hospitalTypeName: "의원",
  departments: [{ departmentCode: "05", departmentName: "정형외과" }],
  distanceKm: 1.2,
  latitude: 37.6971,
  longitude: 127.8887,
  phoneNumber: "000-0000-0000",
  address: "강원특별자치도 OO시 OO로 00",
  hasEmergencyRoom: true,
  today: {
    isOpen: true,
    is24Hours: true,
    openTime: "00:00",
    closeTime: "23:59",
    nextOpenAt: null,
  },
};

function searchResult(hospitals: Hospital[]): HospitalSearchResult {
  return {
    radiusKm: 10,
    dataUpdatedAt: "2026-11-04T04:00:00+09:00",
    totalCount: hospitals.length,
    hospitals,
  };
}

function queryOf(index = 0) {
  const [url] = fetchMock.mock.calls[index];
  const parsed = new URL(url, "http://localhost");
  return { path: parsed.pathname, params: parsed.searchParams };
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("병원 검색 요청", () => {
  it("GET /api/hospitals에 진료과·좌표·반경·개수를 쿼리로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok(searchResult([hospital])));

    await searchHospitals({
      departmentCode: "05",
      latitude: 37.6971,
      longitude: 127.8887,
      radius: 20,
      limit: 5,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    const { path, params } = queryOf();
    expect(path).toBe("/api/hospitals");
    expect(Object.fromEntries(params)).toEqual({
      departmentCode: "05",
      latitude: "37.6971",
      longitude: "127.8887",
      radius: "20",
      limit: "5",
    });
  });

  it("지역으로 찾을 때는 regionCode를 보내고 좌표는 보내지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(ok(searchResult([hospital])));

    await searchHospitals({ departmentCode: "05", regionCode: "51720" });

    const { params } = queryOf();
    expect(params.get("regionCode")).toBe("51720");
    expect(params.has("latitude")).toBe(false);
    expect(params.has("longitude")).toBe(false);
  });

  it("radius와 limit을 비우면 기본값 10km·3곳으로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok(searchResult([hospital])));

    await searchHospitals({ regionCode: "51720" });

    const { params } = queryOf();
    expect(params.get("radius")).toBe("10");
    expect(params.get("limit")).toBe("3");
    expect(params.has("departmentCode")).toBe(false);
  });

  it("radius와 limit은 고치지 않고 지정한 값 그대로 보낸다", async () => {
    fetchMock.mockImplementation(async () => ok(searchResult([hospital])));

    await searchHospitals({ regionCode: "51720", radius: 99, limit: 99 });
    await searchHospitals({ regionCode: "51720", radius: 0, limit: 0 });
    await searchHospitals({ regionCode: "51720", radius: 2.5, limit: -1 });
    await searchHospitals({ regionCode: "51720", radius: 30 });

    expect(queryOf(0).params.get("radius")).toBe("99");
    expect(queryOf(0).params.get("limit")).toBe("99");
    expect(queryOf(1).params.get("radius")).toBe("0");
    expect(queryOf(1).params.get("limit")).toBe("0");
    expect(queryOf(2).params.get("radius")).toBe("2.5");
    expect(queryOf(2).params.get("limit")).toBe("-1");
    // 하나만 생략하면 생략한 것만 기본값을 쓴다.
    expect(queryOf(3).params.get("radius")).toBe("30");
    expect(queryOf(3).params.get("limit")).toBe("3");
  });

  it("서버가 범위 오류로 HOSPITAL_400을 주면 숨기지 않고 던진다", async () => {
    fetchMock.mockResolvedValueOnce(
      fail(400, "HOSPITAL_400", {
        errors: [{ field: "radius", reason: "1~30이어야 해요." }],
      }),
    );

    await expect(
      searchHospitals({ regionCode: "51720", radius: 99 }),
    ).rejects.toMatchObject({ name: "ApiError", code: "HOSPITAL_400" });
  });

  it("위치도 지역도 없으면 쿼리 없이 보내 서버가 location 오류를 내게 한다", async () => {
    fetchMock.mockResolvedValueOnce(
      fail(400, "HOSPITAL_400", {
        errors: [{ field: "location", reason: "위치나 지역이 필요해요." }],
      }),
    );

    const outcome = await searchHospitals();

    expect(outcome.kind).toBe("needsRegion");
    const { params } = queryOf();
    expect(params.has("latitude")).toBe(false);
    expect(params.has("regionCode")).toBe(false);
  });
});

describe("병원 검색 결과 구분", () => {
  it("병원이 있으면 found로 돌려주고 today·hasEmergencyRoom을 그대로 둔다", async () => {
    fetchMock.mockResolvedValueOnce(ok(searchResult([hospital])));

    const outcome = await searchHospitals({ regionCode: "51720" });

    expect(outcome.kind).toBe("found");
    if (outcome.kind !== "found") return;
    expect(outcome.result.hospitals[0].today?.is24Hours).toBe(true);
    expect(outcome.result.hospitals[0].hasEmergencyRoom).toBe(true);
    expect(outcome.result.totalCount).toBe(1);
  });

  it("200이고 빈 배열이면 empty(S05c)이고 반경을 알 수 있다", async () => {
    fetchMock.mockResolvedValueOnce(ok(searchResult([])));

    const outcome = await searchHospitals({ regionCode: "51720" });

    expect(outcome.kind).toBe("empty");
    if (outcome.kind !== "empty") return;
    expect(outcome.result.radiusKm).toBe(10);
    expect(outcome.result.hospitals).toEqual([]);
  });

  it("HOSPITAL_500만 error(S05d)로 돌려준다", async () => {
    fetchMock.mockResolvedValueOnce(fail(500, "HOSPITAL_500"));

    const outcome = await searchHospitals({ regionCode: "51720" });

    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") return;
    expect(outcome.error).toBeInstanceOf(ApiError);
    expect(outcome.error.code).toBe("HOSPITAL_500");
  });

  it("HOSPITAL_400에 field location이 있으면 needsRegion(S05b)이다", async () => {
    fetchMock.mockResolvedValueOnce(
      fail(400, "HOSPITAL_400", {
        errors: [{ field: "location", reason: "위치나 지역이 필요해요." }],
      }),
    );

    const outcome = await searchHospitals();

    expect(outcome.kind).toBe("needsRegion");
    if (outcome.kind !== "needsRegion") return;
    expect(outcome.error.code).toBe("HOSPITAL_400");
  });

  it("location이 errors의 두 번째 항목이어도 needsRegion이다", async () => {
    fetchMock.mockResolvedValueOnce(
      fail(400, "HOSPITAL_400", {
        errors: [
          { field: "radius", reason: "범위를 벗어났어요." },
          { field: "location", reason: "위치나 지역이 필요해요." },
        ],
      }),
    );

    const outcome = await searchHospitals();

    expect(outcome.kind).toBe("needsRegion");
  });

  it("location이 아닌 field의 HOSPITAL_400은 needsRegion이 아니라 ApiError로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(
      fail(400, "HOSPITAL_400", {
        errors: [{ field: "regionCode", reason: "없는 지역이에요." }],
      }),
    );

    const promise = searchHospitals({ regionCode: "00000" });

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code: "HOSPITAL_400" });
  });

  it("errors가 빈 배열인 HOSPITAL_400은 읽다가 깨지지 않고 ApiError로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(fail(400, "HOSPITAL_400", { errors: [] }));

    await expect(
      searchHospitals({ regionCode: "51720" }),
    ).rejects.toMatchObject({ name: "ApiError", code: "HOSPITAL_400" });
  });

  it("result가 null인 HOSPITAL_400도 ApiError로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(fail(400, "HOSPITAL_400"));

    await expect(
      searchHospitals({ regionCode: "51720" }),
    ).rejects.toMatchObject({ name: "ApiError", code: "HOSPITAL_400" });
  });

  it("HOSPITAL_429는 S05d가 아니라 ApiError로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(fail(429, "HOSPITAL_429"));

    await expect(
      searchHospitals({ regionCode: "51720" }),
    ).rejects.toMatchObject({ name: "ApiError", code: "HOSPITAL_429" });
  });

  it("응답을 받지 못하면 NETWORK_ERROR로 던진다", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(
      searchHospitals({ regionCode: "51720" }),
    ).rejects.toMatchObject({ name: "ApiError", code: NETWORK_ERROR });
  });

  it("공통 형식이 아닌 응답은 INVALID_RESPONSE로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html></html>", { status: 502 }),
    );

    await expect(
      searchHospitals({ regionCode: "51720" }),
    ).rejects.toMatchObject({ name: "ApiError", code: INVALID_RESPONSE });
  });

  it("hospitals가 배열이 아닌 성공 응답은 INVALID_RESPONSE로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(ok({ radiusKm: 10 }));

    await expect(
      searchHospitals({ regionCode: "51720" }),
    ).rejects.toMatchObject({ name: "ApiError", code: INVALID_RESPONSE });
  });

  it("취소하면 outcome이 아니라 취소 오류를 그대로 던진다", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const promise = searchHospitals({ regionCode: "51720" }, controller.signal);
    const assertion = expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();

    await assertion;
  });
});

describe("가까운 보건소", () => {
  it("GET /api/hospitals/health-centers/nearest에 위치를 쿼리로 보낸다", async () => {
    const healthCenter = { ...hospital, name: "OO보건소", hospitalType: "71" };
    const result = {
      dataUpdatedAt: "2026-11-04T04:00:00+09:00",
      hospital: healthCenter,
    };
    fetchMock.mockResolvedValueOnce(ok(result));

    await expect(
      getNearestHealthCenter({ latitude: 37.6971, longitude: 127.8887 }),
    ).resolves.toEqual(result);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("GET");
    const { path, params } = queryOf();
    expect(path).toBe("/api/hospitals/health-centers/nearest");
    expect(Object.fromEntries(params)).toEqual({
      latitude: "37.6971",
      longitude: "127.8887",
    });
  });

  it("지역 코드로도 찾고, 보건소가 없으면 hospital이 null이다", async () => {
    const result = {
      dataUpdatedAt: "2026-11-04T04:00:00+09:00",
      hospital: null,
    };
    fetchMock.mockResolvedValueOnce(ok(result));

    await expect(
      getNearestHealthCenter({ regionCode: "51720" }),
    ).resolves.toEqual(result);

    expect(queryOf().params.get("regionCode")).toBe("51720");
  });

  it("실패하면 ApiError를 던진다", async () => {
    fetchMock.mockResolvedValueOnce(fail(500, "HOSPITAL_500"));

    await expect(
      getNearestHealthCenter({ regionCode: "51720" }),
    ).rejects.toMatchObject({ code: "HOSPITAL_500" });
  });
});

describe("가까운 응급실", () => {
  it("GET /api/hospitals/emergency-rooms에 좌표와 기본값 30km·2곳을 쿼리로 보낸다", async () => {
    const result = searchResult([hospital]);
    fetchMock.mockResolvedValueOnce(ok(result));

    await expect(
      getEmergencyRooms({ latitude: 37.6971, longitude: 127.8887 }),
    ).resolves.toEqual(result);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    const { path, params } = queryOf();
    expect(path).toBe("/api/hospitals/emergency-rooms");
    expect(Object.fromEntries(params)).toEqual({
      latitude: "37.6971",
      longitude: "127.8887",
      radius: "30",
      limit: "2",
    });
  });

  it("지역으로 찾을 때는 regionCode와 지정한 반경·개수를 그대로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok(searchResult([hospital])));

    await getEmergencyRooms({ regionCode: "51720", radius: 50, limit: 10 });

    expect(Object.fromEntries(queryOf().params)).toEqual({
      regionCode: "51720",
      radius: "50",
      limit: "10",
    });
  });

  it("위치도 지역도 없으면 위치 쿼리 없이 보내고 서버의 location 오류를 구분할 수 있다", async () => {
    fetchMock.mockResolvedValueOnce(
      fail(400, "HOSPITAL_400", {
        errors: [{ field: "location", reason: "위치나 지역이 필요해요." }],
      }),
    );

    const error: unknown = await getEmergencyRooms().catch(
      (caught: unknown) => caught,
    );

    expect(isLocationRequiredError(error)).toBe(true);
    const { params } = queryOf();
    expect(params.has("latitude")).toBe(false);
    expect(params.has("longitude")).toBe(false);
    expect(params.has("regionCode")).toBe(false);
  });

  it("0건이면 빈 목록을 그대로 돌려준다", async () => {
    fetchMock.mockResolvedValueOnce(ok(searchResult([])));

    const result = await getEmergencyRooms({ regionCode: "51720" });

    expect(result.hospitals).toEqual([]);
  });

  it("hospitals가 배열이 아닌 성공 응답은 INVALID_RESPONSE로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(ok({ radiusKm: 30 }));

    await expect(
      getEmergencyRooms({ regionCode: "51720" }),
    ).rejects.toMatchObject({ name: "ApiError", code: INVALID_RESPONSE });
  });

  it("서버 오류는 ApiError로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(fail(500, "HOSPITAL_500"));

    await expect(
      getEmergencyRooms({ regionCode: "51720" }),
    ).rejects.toMatchObject({ name: "ApiError", code: "HOSPITAL_500" });
  });

  it("취소하면 취소 오류를 그대로 던진다", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const promise = getEmergencyRooms(
      { regionCode: "51720" },
      controller.signal,
    );
    const assertion = expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();

    await assertion;
  });
});

describe("위치 없음 오류 판별", () => {
  const location = { field: "location", reason: "위치나 지역이 필요해요." };
  const radius = { field: "radius", reason: "범위를 벗어났어요." };

  it("HOSPITAL_400이고 errors에 location이 있으면 true다", () => {
    expect(
      isLocationRequiredError(
        new ApiError("HOSPITAL_400", "", 400, { errors: [location] }),
      ),
    ).toBe(true);
  });

  it("location이 두 번째 항목이어도 true다", () => {
    expect(
      isLocationRequiredError(
        new ApiError("HOSPITAL_400", "", 400, { errors: [radius, location] }),
      ),
    ).toBe(true);
  });

  it.each([
    ["다른 field", new ApiError("HOSPITAL_400", "", 400, { errors: [radius] })],
    ["빈 errors", new ApiError("HOSPITAL_400", "", 400, { errors: [] })],
    ["errors 없음", new ApiError("HOSPITAL_400", "", 400, {})],
    ["result가 null", new ApiError("HOSPITAL_400", "", 400, null)],
    [
      "다른 도메인의 400",
      new ApiError("INTAKE_400", "", 400, { errors: [location] }),
    ],
    ["HOSPITAL_500", new ApiError("HOSPITAL_500", "", 500)],
    ["ApiError가 아닌 오류", new Error("오류")],
    ["null", null],
  ])("%s이면 false다", (_name, error) => {
    expect(isLocationRequiredError(error)).toBe(false);
  });
});
