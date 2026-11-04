import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR, SERVER_ERROR_MESSAGE } from "@/api/errors";
import {
  searchHospitals,
  type Hospital,
  type HospitalSearchOutcome,
  type HospitalSearchResult,
} from "@/api/hospitals";
import {
  getIntakeDepartment,
  type DepartmentRecommendation,
  type IntakeResponse,
} from "@/api/intakes";
import {
  createHospitalsScreen,
  type HospitalsExit,
  type HospitalsView,
} from "@/pages/hospitals/hospitalsScreen";
import { resolveSearchLocation } from "@/pages/hospitals/searchLocation";
import {
  beginIntakeSession,
  readIntakeSession,
  resetIntakeFlow,
} from "@/stores/intakeSession";
import {
  readSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";

vi.mock("@/api/hospitals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/hospitals")>()),
  searchHospitals: vi.fn(),
}));
vi.mock("@/api/intakes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/intakes")>()),
  getIntakeDepartment: vi.fn(),
}));
vi.mock("@/pages/hospitals/searchLocation", () => ({
  resolveSearchLocation: vi.fn(),
}));

// 모든 값은 가짜 데이터입니다.
const searchMock = vi.mocked(searchHospitals);
const departmentMock = vi.mocked(getIntakeDepartment);
const locationMock = vi.mocked(resolveSearchLocation);

const department: DepartmentRecommendation = {
  departmentCode: "05",
  departmentName: "정형외과",
  recommendReason: "무릎 통증이 있어 정형외과 진료를 권해요.",
};

const hospital: Hospital = {
  hospitalId: 101,
  name: "OO정형외과의원",
  hospitalType: "31",
  hospitalTypeName: "의원",
  departments: [{ departmentCode: "05", departmentName: "정형외과" }],
  distanceKm: 1.2,
  latitude: 37.69,
  longitude: 127.88,
  phoneNumber: "000-0000-0000",
  address: "강원특별자치도 OO시 OO로 00",
  hasEmergencyRoom: false,
  today: null,
};

function result(hospitals: Hospital[], radiusKm = 10): HospitalSearchResult {
  return {
    radiusKm,
    dataUpdatedAt: "2026-11-04T04:00:00+09:00",
    totalCount: hospitals.length,
    hospitals,
  };
}

const found: HospitalSearchOutcome = {
  kind: "found",
  result: result([hospital]),
};

function completedIntake(
  overrides: Partial<IntakeResponse> = {},
): IntakeResponse {
  return {
    intakeId: "intake-1",
    status: "COMPLETED",
    stage: "BASIC_INFO",
    progress: { current: 5, total: 5 },
    collected: [],
    question: null,
    reask: false,
    emergency: null,
    department,
    summaryId: "summary-1",
    ...overrides,
  };
}

function apiError(code: string, status: number) {
  return new ApiError(code, "서버 안내 문장", status);
}

interface Harness {
  views: HospitalsView[];
  exits: HospitalsExit[];
  screen: ReturnType<typeof createHospitalsScreen>;
  last: () => HospitalsView;
}

function setup(query = {}): Harness {
  const views: HospitalsView[] = [];
  const exits: HospitalsExit[] = [];
  const screen = createHospitalsScreen(query, {
    onView: (view) => views.push(view),
    onExit: (exit) => exits.push(exit),
  });
  return { views, exits, screen, last: () => views[views.length - 1] };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  searchMock.mockReset();
  departmentMock.mockReset();
  locationMock.mockReset();
  locationMock.mockResolvedValue({
    params: { latitude: 37.5, longitude: 127.5 },
    point: { latitude: 37.5, longitude: 127.5 },
  });
  searchMock.mockResolvedValue(found);
  resetIntakeFlow();
});

afterEach(() => {
  resetIntakeFlow();
});

describe("S05 진료과 정하기", () => {
  it("문진 응답(COMPLETED)에서 받아 둔 진료과를 쓰고 다시 조회하지 않는다", async () => {
    beginIntakeSession(completedIntake());
    const { screen, last } = setup();

    await screen.load();

    expect(departmentMock).not.toHaveBeenCalled();
    expect(searchMock.mock.calls[0][0]).toMatchObject({
      departmentCode: "05",
    });
    expect(last().department).toEqual(department);
  });

  it("기억한 문진이 없어도 문진·요약지 ID가 있으면 서버에서 진료과를 다시 조회한다", async () => {
    saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });
    departmentMock.mockResolvedValue({ intakeId: "intake-1", ...department });
    const { screen, last } = setup();

    await screen.load();

    expect(departmentMock).toHaveBeenCalledTimes(1);
    expect(departmentMock.mock.calls[0][0]).toBe("intake-1");
    expect(last()).toMatchObject({ phase: "ready", department });
  });

  it("다시 조회한 응답에서 문진 ID는 빼고 진료과 세 가지만 쓴다", async () => {
    saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });
    departmentMock.mockResolvedValue({ intakeId: "intake-1", ...department });
    const { screen, last } = setup();

    await screen.load();

    expect(Object.keys(last().department ?? {}).sort()).toEqual([
      "departmentCode",
      "departmentName",
      "recommendReason",
    ]);
  });

  it("문진이 끝나지(COMPLETED) 않았으면 받아 둔 진료과가 있어도 쓰지 않는다", async () => {
    beginIntakeSession(completedIntake({ status: "IN_PROGRESS" }));
    const { screen, exits } = setup();

    await screen.load();

    expect(exits).toEqual([{ to: "start" }]);
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("문진을 끝낸 기록이 없으면(새로고침·직접 진입) 요청하지 않고 처음으로 보낸다", async () => {
    const { screen, exits, last } = setup();

    await screen.load();

    expect(exits).toEqual([{ to: "start" }]);
    expect(departmentMock).not.toHaveBeenCalled();
    expect(locationMock).not.toHaveBeenCalled();
    expect(searchMock).not.toHaveBeenCalled();
    expect(last().phase).toBe("loading");
  });

  it.each(["DEPARTMENT_403", "DEPARTMENT_404", "DEPARTMENT_409"])(
    "%s이면 기억한 문진·요약지 ID를 지우고 처음으로 보낸다",
    async (code) => {
      saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });
      departmentMock.mockRejectedValue(apiError(code, 404));
      const { screen, exits } = setup();

      await screen.load();

      expect(exits).toEqual([{ to: "start" }]);
      expect(readSummarySession()).toBeNull();
      expect(readIntakeSession()).toBeNull();
    },
  );
});

describe("S05 병원 찾기", () => {
  it("진료과 코드와 현재 위치로 찾고 반경은 주소에 있을 때만 보낸다", async () => {
    beginIntakeSession(completedIntake());
    const { screen } = setup();

    await screen.load();

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0][0]).toEqual({
      departmentCode: "05",
      latitude: 37.5,
      longitude: 127.5,
      radius: undefined,
    });
  });

  it("주소의 반경과 지역 코드를 그대로 쓴다", async () => {
    beginIntakeSession(completedIntake());
    locationMock.mockResolvedValue({
      params: { regionCode: "51720" },
      point: null,
    });
    const { screen } = setup({ radius: 30, regionCode: "51720" });

    await screen.load();

    expect(locationMock).toHaveBeenCalledWith({
      radius: 30,
      regionCode: "51720",
    });
    expect(searchMock.mock.calls[0][0]).toEqual({
      departmentCode: "05",
      regionCode: "51720",
      radius: 30,
    });
  });

  it("병원을 찾으면 목록과 내 위치를 보여 준다", async () => {
    beginIntakeSession(completedIntake());
    const { screen, last, exits } = setup();

    await screen.load();

    expect(last()).toEqual({
      phase: "ready",
      department,
      result: result([hospital]),
      userLocation: { latitude: 37.5, longitude: 127.5 },
      message: null,
    });
    expect(exits).toEqual([]);
  });

  it("지역으로 찾으면 지도에 내 위치를 표시하지 않는다", async () => {
    beginIntakeSession(completedIntake());
    locationMock.mockResolvedValue({
      params: { regionCode: "51720" },
      point: null,
    });
    const { screen, last } = setup({ regionCode: "51720" });

    await screen.load();

    expect(last().userLocation).toBeNull();
  });

  it("찾는 동안은 불러오는 중으로 보인다", async () => {
    beginIntakeSession(completedIntake());
    const pending = deferred<HospitalSearchOutcome>();
    searchMock.mockReturnValue(pending.promise);
    const { screen, last } = setup();

    const loading = screen.load();
    await vi.waitFor(() => expect(searchMock).toHaveBeenCalled());

    expect(last().phase).toBe("loading");
    pending.resolve(found);
    await loading;
    expect(last().phase).toBe("ready");
  });
});

describe("S05 결과에 따른 이동", () => {
  beforeEach(() => {
    beginIntakeSession(completedIntake());
  });

  it("반경 안에 병원이 없으면(200 + 빈 배열) S05c로 보낸다", async () => {
    searchMock.mockResolvedValue({ kind: "empty", result: result([]) });
    const { screen, exits, last } = setup();

    await screen.load();

    expect(exits).toEqual([{ to: "empty" }]);
    expect(last().phase).toBe("loading");
  });

  it("공공데이터 조회 실패(HOSPITAL_500)면 S05d로 보낸다", async () => {
    searchMock.mockResolvedValue({
      kind: "error",
      error: apiError("HOSPITAL_500", 500),
    });
    const { screen, exits } = setup();

    await screen.load();

    expect(exits).toEqual([{ to: "error" }]);
  });

  it("서버가 위치도 지역도 없다고 하면(HOSPITAL_400, location) 위치 확인으로 보낸다", async () => {
    searchMock.mockResolvedValue({
      kind: "needsRegion",
      error: apiError("HOSPITAL_400", 400),
    });
    const { screen, exits } = setup();

    await screen.load();

    expect(exits).toEqual([{ to: "location", locationFailed: false }]);
  });

  it("위치 권한을 거부했거나 측정에 실패하면 검색하지 않고 위치를 얻지 못했다고 알리며 위치 확인으로 보낸다", async () => {
    locationMock.mockResolvedValue(null);
    const { screen, exits } = setup();

    await screen.load();

    expect(exits).toEqual([{ to: "location", locationFailed: true }]);
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("이동은 한 번만 일어난다", async () => {
    searchMock.mockResolvedValue({ kind: "empty", result: result([]) });
    const { screen, exits } = setup();

    await screen.load();
    await screen.load();

    expect(exits).toEqual([{ to: "empty" }]);
  });
});

describe("S05 실패와 재시도", () => {
  beforeEach(() => {
    beginIntakeSession(completedIntake());
  });

  it("네트워크 오류는 이 화면에서 안내하고 다시 시도하면 처음부터 다시 찾는다", async () => {
    searchMock.mockRejectedValueOnce(new ApiError(NETWORK_ERROR, "", 0));
    const { screen, last, exits } = setup();

    await screen.load();

    expect(last()).toMatchObject({
      phase: "error",
      message: SERVER_ERROR_MESSAGE,
      result: null,
      department: null,
    });
    expect(exits).toEqual([]);

    await screen.load();

    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(last().phase).toBe("ready");
    expect(last().message).toBeNull();
  });

  it("location이 아닌 HOSPITAL_400, HOSPITAL_429는 S05d가 아니라 이 화면에서 안내한다", async () => {
    searchMock.mockRejectedValueOnce(
      new ApiError("HOSPITAL_400", "30km까지 검색할 수 있어요", 400, {
        errors: [{ field: "radius", reason: "30km까지 검색할 수 있어요" }],
      }),
    );
    searchMock.mockRejectedValueOnce(
      new ApiError("HOSPITAL_429", "잠시 뒤에 다시 시도해 주세요.", 429),
    );
    const { screen, last, exits } = setup();

    await screen.load();
    expect(last()).toMatchObject({
      phase: "error",
      message: "30km까지 검색할 수 있어요",
    });

    await screen.load();
    expect(last()).toMatchObject({
      phase: "error",
      message: "잠시 뒤에 다시 시도해 주세요.",
    });
    expect(exits).toEqual([]);
  });

  it("진료과 조회가 네트워크 오류로 실패해도 이 화면에서 안내한다", async () => {
    resetIntakeFlow();
    saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });
    departmentMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));
    const { screen, last, exits } = setup();

    await screen.load();

    expect(last().phase).toBe("error");
    expect(exits).toEqual([]);
    // 일시적인 실패라 기억한 ID는 그대로 둔다.
    expect(readSummarySession()).not.toBeNull();
  });

  it("API 오류가 아닌 예외(코드 실수)는 서버 오류 안내로 바꾸지 않고 던진다", async () => {
    searchMock.mockRejectedValue(new TypeError("개발자 실수"));
    const { screen, last } = setup();

    await expect(screen.load()).rejects.toThrow("개발자 실수");

    expect(last().phase).not.toBe("error");
  });
});

describe("S05 화면을 떠날 때", () => {
  beforeEach(() => {
    beginIntakeSession(completedIntake());
  });

  it("진행 중인 요청을 취소하고, 응답이 와도 화면과 이동을 알리지 않는다", async () => {
    const pending = deferred<HospitalSearchOutcome>();
    searchMock.mockReturnValue(pending.promise);
    const { screen, views, exits } = setup();
    const loading = screen.load();
    await vi.waitFor(() => expect(searchMock).toHaveBeenCalled());
    const viewCount = views.length;

    screen.dispose();
    const signal = searchMock.mock.calls[0][1];
    pending.resolve({ kind: "empty", result: result([]) });
    await loading;

    expect(signal?.aborted).toBe(true);
    expect(views).toHaveLength(viewCount);
    expect(exits).toEqual([]);
  });

  it("위치를 정하는 동안 떠나면 병원을 찾지 않는다", async () => {
    const pending =
      deferred<Awaited<ReturnType<typeof resolveSearchLocation>>>();
    locationMock.mockReturnValue(pending.promise);
    const { screen, exits } = setup();
    const loading = screen.load();
    await vi.waitFor(() => expect(locationMock).toHaveBeenCalled());

    screen.dispose();
    pending.resolve({
      params: { latitude: 37.5, longitude: 127.5 },
      point: { latitude: 37.5, longitude: 127.5 },
    });
    await loading;

    expect(searchMock).not.toHaveBeenCalled();
    expect(exits).toEqual([]);
  });

  it("취소 오류로 끝난 요청은 실패 안내를 보이지 않는다", async () => {
    searchMock.mockImplementation(async (_params, signal) => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      signal?.throwIfAborted();
      return found;
    });
    const { screen, views } = setup();

    const loading = screen.load();
    await vi.waitFor(() => expect(searchMock).toHaveBeenCalled());
    screen.dispose();
    await loading;

    expect(views.some((view) => view.phase === "error")).toBe(false);
  });

  it("다시 시도하면 이전에 진행하던 요청은 취소하고 그 응답은 쓰지 않는다", async () => {
    const first = deferred<HospitalSearchOutcome>();
    searchMock.mockReturnValueOnce(first.promise);
    const { screen, last, exits } = setup();
    const firstLoading = screen.load();
    await vi.waitFor(() => expect(searchMock).toHaveBeenCalledTimes(1));
    const firstSignal = searchMock.mock.calls[0][1];

    await screen.load();
    first.resolve({ kind: "empty", result: result([]) });
    await firstLoading;

    expect(firstSignal?.aborted).toBe(true);
    expect(last().phase).toBe("ready");
    expect(exits).toEqual([]);
  });
});
