import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, onUnauthenticated } from "@/api/client";
import {
  ApiError,
  getErrorMessage,
  getFieldErrors,
  getIntakeConflictStatus,
  getSavedMedicalRecordId,
  INVALID_RESPONSE,
  isLlmUnavailable,
  isServerError,
  LLM_ERROR_MESSAGE,
  NETWORK_ERROR,
  SERVER_ERROR_MESSAGE,
} from "@/api/errors";
import { formatCollectedList, formatCollectedValue } from "@/api/values";

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
  envelope(200, { isSuccess: true, code: "INTAKE_200", result });
const authExpired = () =>
  envelope(401, {
    isSuccess: false,
    code: "AUTH_401",
    message: "로그인이 필요해요.",
  });

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("오류가 나지 않았어요");
}

function calledUrls() {
  return fetchMock.mock.calls.map(([url]) => url);
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("요청", () => {
  it("/api 상대 경로로 JSON과 쿠키를 포함해 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok({ intakeId: "intake-1" }));

    const result = await apiRequest<{ intakeId: string }>("/intakes", {
      method: "POST",
      body: { inputMode: "BUTTON", bodyPart: "LEG_KNEE" },
    });

    expect(result).toEqual({ intakeId: "intake-1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/intakes");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(init.body).toBe('{"inputMode":"BUTTON","bodyPart":"LEG_KNEE"}');
  });

  it("본문이 없으면 GET으로 보내고 content-type을 붙이지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(ok(null));

    await apiRequest("/regions");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).has("content-type")).toBe(false);
  });

  it("null·undefined인 쿼리 값은 빼고 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok([]));

    await apiRequest("/hospitals", {
      query: {
        departmentCode: "05",
        latitude: 37.88,
        longitude: 127.73,
        regionCode: null,
        radius: undefined,
        limit: 3,
      },
    });

    expect(calledUrls()[0]).toBe(
      "/api/hospitals?departmentCode=05&latitude=37.88&longitude=127.73&limit=3",
    );
  });

  it.each(["intakes", "/api/intakes"])(
    "잘못된 경로 %s는 막는다",
    async (path) => {
      await expect(apiRequest(path)).rejects.toThrow("API 경로");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("본문을 JSON으로 바꾸지 못하면 NETWORK_ERROR로 바꾸지 않는다", async () => {
    const body: Record<string, unknown> = {};
    body.self = body;

    const promise = apiRequest("/intakes", { method: "POST", body });

    await expect(promise).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("응답 파싱과 오류", () => {
  it("실패 응답은 code·message·result·HTTP 상태를 담은 ApiError로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(409, {
        isSuccess: false,
        code: "INTAKE_409",
        message: "이미 끝난 문진이에요.",
        result: { status: "COMPLETED" },
      }),
    );

    const error = await catchError(apiRequest("/intakes/intake-1/answers"));

    expect(error.code).toBe("INTAKE_409");
    expect(error.message).toBe("이미 끝난 문진이에요.");
    expect(error.status).toBe(409);
    expect(getIntakeConflictStatus(error)).toBe("COMPLETED");
  });

  it("INTAKE_409에 result가 없으면 중복 전송으로 본다", () => {
    const error = new ApiError("INTAKE_409", "", 409, null);
    expect(getIntakeConflictStatus(error)).toBeNull();
  });

  it("SUMMARY_409에서 이미 보관한 기록 ID를 꺼낸다", () => {
    expect(
      getSavedMedicalRecordId(
        new ApiError("SUMMARY_409", "", 409, { medicalRecordId: 12 }),
      ),
    ).toBe(12);
    expect(
      getSavedMedicalRecordId(new ApiError("SUMMARY_409", "", 409, null)),
    ).toBeNull();
  });

  it("400 응답의 필드 오류를 꺼낸다", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(400, {
        isSuccess: false,
        code: "GUARDIAN_400",
        message: "입력값을 확인해 주세요.",
        result: {
          errors: [{ field: "phoneNumber", reason: "숫자 10~11자리여야 해요" }],
        },
      }),
    );

    const error = await catchError(
      apiRequest("/members/me/guardian", { method: "PUT" }),
    );

    expect(getFieldErrors(error)).toEqual([
      { field: "phoneNumber", reason: "숫자 10~11자리여야 해요" },
    ]);
    expect(getErrorMessage(error)).toBe("입력값을 확인해 주세요.");
  });

  it("HOSPITAL_400처럼 result가 null인 400은 빈 필드 오류를 돌려준다", () => {
    expect(
      getFieldErrors(new ApiError("HOSPITAL_400", "위치가 필요해요.", 400)),
    ).toEqual([]);
  });

  it("공통 형식이 아닌 응답(프록시 502)은 INVALID_RESPONSE로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "bad_gateway",
          message: "백엔드에 연결할 수 없습니다.",
        }),
        {
          status: 502,
        },
      ),
    );

    const error = await catchError(apiRequest("/regions"));

    expect(error.code).toBe(INVALID_RESPONSE);
    expect(error.status).toBe(502);
    expect(isServerError(error)).toBe(true);
    expect(getErrorMessage(error)).toBe(SERVER_ERROR_MESSAGE);
  });

  it.each([200, 403, 429])(
    "JSON이 아닌 %d 응답도 INVALID_RESPONSE이고 서버 오류로 본다",
    async (status) => {
      fetchMock.mockResolvedValueOnce(
        new Response("<!doctype html>", { status }),
      );

      const error = await catchError(apiRequest("/regions"));

      expect(error.code).toBe(INVALID_RESPONSE);
      expect(error.status).toBe(status);
      expect(isServerError(error)).toBe(true);
      expect(getErrorMessage(error)).toBe(SERVER_ERROR_MESSAGE);
    },
  );

  it("네트워크 오류는 NETWORK_ERROR로 던진다", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const error = await catchError(apiRequest("/regions"));

    expect(error.code).toBe(NETWORK_ERROR);
    expect(error.status).toBe(0);
    expect(getErrorMessage(error)).toBe(SERVER_ERROR_MESSAGE);
  });

  it("요청을 취소하면 ApiError로 바꾸지 않는다", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));

    await expect(
      apiRequest("/regions", { signal: controller.signal }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("본문을 읽는 중에 취소하면 ApiError로 바꾸지 않는다", async () => {
    const controller = new AbortController();
    const response = new Response("{}", { status: 200 });
    vi.spyOn(response, "text").mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException("aborted", "AbortError"));
    });
    fetchMock.mockResolvedValueOnce(response);

    await expect(
      apiRequest("/regions", { signal: controller.signal }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("본문을 읽는 중에 연결이 끊기면 NETWORK_ERROR로 던진다", async () => {
    const response = new Response("{}", { status: 200 });
    vi.spyOn(response, "text").mockRejectedValue(
      new TypeError("network error"),
    );
    fetchMock.mockResolvedValueOnce(response);

    const error = await catchError(apiRequest("/regions"));

    expect(error.code).toBe(NETWORK_ERROR);
    expect(error.status).toBe(0);
  });

  it.each([
    ["HOSPITAL_500", true, false, SERVER_ERROR_MESSAGE],
    ["INTAKE_503", false, true, LLM_ERROR_MESSAGE],
    ["SUMMARY_503", false, true, LLM_ERROR_MESSAGE],
    ["INTAKE_422", false, false, "다시 말씀해 주세요."],
  ])("%s 분기", (code, server, llm, message) => {
    const error = new ApiError(
      code,
      "다시 말씀해 주세요.",
      Number(code.slice(-3)),
    );
    expect(isServerError(error)).toBe(server);
    expect(isLlmUnavailable(error)).toBe(llm);
    expect(getErrorMessage(error)).toBe(message);
  });
});

describe("AUTH_401 재시도", () => {
  it("refresh를 한 번 부르고 원래 요청을 다시 보낸다", async () => {
    fetchMock
      .mockResolvedValueOnce(authExpired())
      .mockResolvedValueOnce(
        envelope(200, { isSuccess: true, code: "AUTH_200" }),
      )
      .mockResolvedValueOnce(ok({ nickname: "가짜 이름" }));

    const result = await apiRequest("/members/me");

    expect(result).toEqual({ nickname: "가짜 이름" });
    expect(calledUrls()).toEqual([
      "/api/members/me",
      "/api/auth/refresh",
      "/api/members/me",
    ]);
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });

  it("다시 보낼 때 같은 본문을 보낸다", async () => {
    fetchMock
      .mockResolvedValueOnce(authExpired())
      .mockResolvedValueOnce(
        envelope(200, { isSuccess: true, code: "AUTH_200" }),
      )
      .mockResolvedValueOnce(ok(null));

    await apiRequest("/summaries/summary-1", {
      method: "PATCH",
      body: { mainSymptom: "무릎 통증" },
    });

    expect(fetchMock.mock.calls[2][1].body).toBe('{"mainSymptom":"무릎 통증"}');
    expect(fetchMock.mock.calls[2][1].method).toBe("PATCH");
  });

  it("동시에 여러 요청이 401이면 refresh는 한 번만 부른다", async () => {
    let refreshCount = 0;
    const retried = new Set<string>();
    fetchMock.mockImplementation(async (url) => {
      if (url === "/api/auth/refresh") {
        refreshCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return envelope(200, { isSuccess: true, code: "AUTH_200" });
      }
      if (!retried.has(url)) {
        retried.add(url);
        return authExpired();
      }
      return ok(url);
    });

    const results = await Promise.all([
      apiRequest("/members/me"),
      apiRequest("/members/me/summaries"),
      apiRequest("/regions"),
    ]);

    expect(refreshCount).toBe(1);
    expect(results).toEqual([
      "/api/members/me",
      "/api/members/me/summaries",
      "/api/regions",
    ]);
  });

  it("refresh가 끝난 뒤 새 401이 오면 다시 refresh한다", async () => {
    fetchMock
      .mockResolvedValueOnce(authExpired())
      .mockResolvedValueOnce(
        envelope(200, { isSuccess: true, code: "AUTH_200" }),
      )
      .mockResolvedValueOnce(ok(1))
      .mockResolvedValueOnce(authExpired())
      .mockResolvedValueOnce(
        envelope(200, { isSuccess: true, code: "AUTH_200" }),
      )
      .mockResolvedValueOnce(ok(2));

    expect(await apiRequest("/members/me")).toBe(1);
    expect(await apiRequest("/members/me")).toBe(2);
    expect(
      calledUrls().filter((url) => url === "/api/auth/refresh"),
    ).toHaveLength(2);
  });

  it("refresh도 AUTH_401이면 비로그인 상태를 알리고 원래 오류를 던진다", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthenticated(listener);
    fetchMock
      .mockResolvedValueOnce(authExpired())
      .mockResolvedValueOnce(authExpired());

    const error = await catchError(apiRequest("/members/me"));
    unsubscribe();

    expect(error.code).toBe("AUTH_401");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(calledUrls()).toEqual(["/api/members/me", "/api/auth/refresh"]);
  });

  it("동시에 여러 요청이 refresh까지 AUTH_401이면 비로그인 알림은 한 번만 보낸다", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthenticated(listener);
    fetchMock.mockImplementation(async (url) => {
      if (url === "/api/auth/refresh") {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return authExpired();
    });

    const results = await Promise.allSettled([
      apiRequest("/members/me"),
      apiRequest("/members/me/summaries"),
      apiRequest("/regions"),
    ]);
    unsubscribe();

    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
      "rejected",
    ]);
    expect(
      calledUrls().filter((url) => url === "/api/auth/refresh"),
    ).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("다시 보낸 요청도 AUTH_401이면 더 재시도하지 않고 비로그인 상태를 알린다", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthenticated(listener);
    fetchMock
      .mockResolvedValueOnce(authExpired())
      .mockResolvedValueOnce(
        envelope(200, { isSuccess: true, code: "AUTH_200" }),
      )
      .mockResolvedValueOnce(authExpired());

    const error = await catchError(apiRequest("/members/me"));
    unsubscribe();

    expect(error.code).toBe("AUTH_401");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("refresh가 서버 오류면 비로그인으로 바꾸지 않고 그 오류를 던진다", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthenticated(listener);
    fetchMock
      .mockResolvedValueOnce(authExpired())
      .mockResolvedValueOnce(
        envelope(500, { isSuccess: false, code: "AUTH_500" }),
      );

    const error = await catchError(apiRequest("/members/me"));
    unsubscribe();

    expect(error.code).toBe("AUTH_500");
    expect(listener).not.toHaveBeenCalled();
  });

  it("refresh 요청 자신이 401이면 재시도하지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(authExpired());

    const error = await catchError(
      apiRequest("/auth/refresh", { method: "POST" }),
    );

    expect(error.code).toBe("AUTH_401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("공통 값 규칙", () => {
  it.each([
    [null, "확인 못 했어요"],
    [[], "없음"],
    [["혈압약", "당뇨약"], "혈압약, 당뇨약"],
  ])("목록 %j → %s", (value, text) => {
    expect(formatCollectedList(value)).toBe(text);
  });

  it.each([
    [null, "확인 못 했어요"],
    ["", "확인 못 했어요"],
    ["2~3일 전부터", "2~3일 전부터"],
  ])("값 %j → %s", (value, text) => {
    expect(formatCollectedValue(value)).toBe(text);
  });
});
