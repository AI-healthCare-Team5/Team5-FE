import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  getSavedMedicalRecordId,
  INVALID_RESPONSE,
} from "@/api/errors";
import {
  deleteRecord,
  getRecord,
  listRecords,
  RECORDS_PAGE_SIZE,
  saveSummaryToRecords,
} from "@/api/records";
import { sampleSummary } from "@/stores/fixtures";

// 실제 백엔드가 아니라 fetch를 가짜로 바꿔 요청 모양과 응답 처리를 확인합니다.
// 응답 모양은 백엔드 Swagger(RecordListResponse, RecordDetailResponse 등)를 따라 만든 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

function envelope(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify({ message: "", result: null, ...body }), {
    status,
  });
}

function ok(code: string, result: unknown) {
  return envelope(200, { isSuccess: true, code, result });
}

function failure(code: string, result: unknown = null) {
  return envelope(Number(code.slice(-3)), { isSuccess: false, code, result });
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("실패해야 하는 요청이 성공했어요.");
}

describe("요약지 보관 API", () => {
  it("본문 없이 POST로 보내고 기록 ID를 받는다", async () => {
    const result = {
      medicalRecordId: 12,
      savedAt: "2026-11-04T14:25:00+09:00",
    };
    fetchMock.mockResolvedValueOnce(ok("SUMMARY_201", result));

    await expect(saveSummaryToRecords("summary-1")).resolves.toEqual(result);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/summaries/summary-1/save");
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it("요약지 ID는 경로에 맞게 인코딩한다", async () => {
    fetchMock.mockResolvedValueOnce(ok("SUMMARY_201", {}));

    await saveSummaryToRecords("a/b c");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/summaries/a%2Fb%20c/save");
  });

  it("SUMMARY_409에 기록 ID가 있으면 이미 보관한 요약지다", async () => {
    fetchMock.mockResolvedValueOnce(
      failure("SUMMARY_409", { medicalRecordId: 12 }),
    );

    const error = await catchError(saveSummaryToRecords("summary-1"));

    expect(error.code).toBe("SUMMARY_409");
    expect(getSavedMedicalRecordId(error)).toBe(12);
  });

  it("SUMMARY_409의 result가 null이면 아직 만드는 중이다", async () => {
    fetchMock.mockResolvedValueOnce(failure("SUMMARY_409"));

    const error = await catchError(saveSummaryToRecords("summary-1"));

    expect(error.code).toBe("SUMMARY_409");
    expect(getSavedMedicalRecordId(error)).toBeNull();
  });

  it.each(["CONSENT_403", "SUMMARY_403", "SUMMARY_404"])(
    "%s는 ApiError로 던진다",
    async (code) => {
      fetchMock.mockResolvedValueOnce(failure(code));

      await expect(
        catchError(saveSummaryToRecords("summary-1")),
      ).resolves.toMatchObject({ code });
    },
  );
});

describe("내 기록 목록 API", () => {
  const page = {
    page: 0,
    size: 20,
    totalCount: 1,
    hasNext: false,
    records: [
      {
        medicalRecordId: 12,
        createdAt: "2026-10-16T14:25:00+09:00",
        departmentName: "정형외과",
        mainSymptom: "무릎 통증",
        subtitle: "3일 전부터 · 붓기 있음",
      },
    ],
  };

  it("기본으로 page 0, size 20을 쿼리로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok("SUMMARY_200", page));

    await expect(listRecords()).resolves.toEqual(page);

    expect(RECORDS_PAGE_SIZE).toBe(20);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/members/me/summaries?page=0&size=20",
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
  });

  it("page와 size를 그대로 보내고 서버가 만든 subtitle을 바꾸지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(ok("SUMMARY_200", page));

    const result = await listRecords({ page: 2, size: 5 });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/members/me/summaries?page=2&size=5",
    );
    expect(result.records[0].subtitle).toBe("3일 전부터 · 붓기 있음");
  });

  it("기록이 없으면 빈 목록이다", async () => {
    fetchMock.mockResolvedValueOnce(
      ok("SUMMARY_200", { ...page, totalCount: 0, records: [] }),
    );

    await expect(listRecords()).resolves.toMatchObject({ records: [] });
  });

  it("records가 배열이 아니면 INVALID_RESPONSE다", async () => {
    fetchMock.mockResolvedValueOnce(ok("SUMMARY_200", { page: 0 }));

    await expect(catchError(listRecords())).resolves.toMatchObject({
      code: INVALID_RESPONSE,
    });
  });

  it("AUTH_401이고 재발급도 실패하면 AUTH_401을 던진다", async () => {
    // 요청마다 새 Response가 필요합니다(본문은 한 번만 읽을 수 있습니다).
    fetchMock.mockImplementation(async () => failure("AUTH_401"));

    await expect(catchError(listRecords())).resolves.toMatchObject({
      code: "AUTH_401",
    });
    // 목록 요청, 토큰 재발급(실패)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/members/me/summaries?page=0&size=20",
      "/api/auth/refresh",
    ]);
  });
});

describe("기록 상세·삭제 API", () => {
  it("상세는 S06과 같은 summary 모양을 그대로 돌려준다", async () => {
    const detail = {
      medicalRecordId: 12,
      createdAt: "2026-10-16T14:25:00+09:00",
      summary: { ...sampleSummary, medications: null, conditions: [] },
    };
    fetchMock.mockResolvedValueOnce(ok("SUMMARY_200", detail));

    const result = await getRecord(12);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/members/me/summaries/12");
    // null(확인 못 함)과 [](없음)이 그대로 남는다
    expect(result.summary.medications).toBeNull();
    expect(result.summary.conditions).toEqual([]);
  });

  it("summary가 없는 응답은 INVALID_RESPONSE다", async () => {
    fetchMock.mockResolvedValueOnce(
      ok("SUMMARY_200", { medicalRecordId: 12, createdAt: "x" }),
    );

    await expect(catchError(getRecord(12))).resolves.toMatchObject({
      code: INVALID_RESPONSE,
    });
  });

  it.each(["SUMMARY_403", "SUMMARY_404"])("상세 %s는 던진다", async (code) => {
    fetchMock.mockResolvedValueOnce(failure(code));

    await expect(catchError(getRecord(12))).resolves.toMatchObject({ code });
  });

  it("삭제는 DELETE로 보내고 지운 기록 ID를 받는다", async () => {
    fetchMock.mockResolvedValueOnce(ok("SUMMARY_200", { medicalRecordId: 12 }));

    await expect(deleteRecord(12)).resolves.toEqual({ medicalRecordId: 12 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/members/me/summaries/12");
    expect(init.method).toBe("DELETE");
  });

  it("이미 지운 기록 삭제는 SUMMARY_404다", async () => {
    fetchMock.mockResolvedValueOnce(failure("SUMMARY_404"));

    await expect(catchError(deleteRecord(12))).resolves.toMatchObject({
      code: "SUMMARY_404",
    });
  });
});
