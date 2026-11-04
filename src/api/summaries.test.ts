import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, INVALID_RESPONSE } from "@/api/errors";
import {
  confirmSummary,
  getEmergencyCard,
  getSummary,
  isSummaryConflict,
  pollSummary,
  retrySummary,
  updateSummary,
  type EmergencyCardResponse,
  type SummaryContent,
  type SummaryResponse,
} from "@/api/summaries";

// 모든 값은 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

const summaryId = "8b1d2e3f-0000-4000-8000-000000000001";
const intakeId = "3f2a9c1e-0000-4000-8000-000000000001";

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
  envelope(200, { isSuccess: true, code: "SUMMARY_200", result });
const fail = (status: number, code: string, result: unknown = null) =>
  envelope(status, { isSuccess: false, code, message: "안내 문장", result });

const content: SummaryContent = {
  ageGroup: "SEVENTIES",
  gender: "FEMALE",
  inputMode: "BUTTON",
  mainSymptom: "OO 불편",
  bodyPart: "LEG_KNEE",
  onset: "DAYS_2_3",
  onsetDetail: "2~3일 전부터",
  extraNote: null,
  medications: null,
  conditions: [],
  allergies: [{ name: "OO", detail: null }],
  items: [{ order: 1, label: "붓기", question: "부었나요?", value: null }],
  department: {
    departmentCode: "05",
    departmentName: "정형외과",
    recommendReason: "정형외과 진료를 권해요.",
  },
  isConfirmed: false,
};

function generating(inProgress: number): SummaryResponse {
  const steps = (
    ["BASIC_INFO", "SYMPTOM", "HEALTH_INFO", "DEPARTMENT"] as const
  ).map((step, index) => ({
    step,
    status:
      index < inProgress
        ? ("DONE" as const)
        : index === inProgress
          ? ("IN_PROGRESS" as const)
          : ("WAITING" as const),
  }));
  return {
    summaryId,
    intakeId,
    status: "GENERATING",
    steps,
    summary: null,
    createdAt: "2026-11-04T10:00:00+09:00",
  };
}

const done = (): SummaryResponse => ({
  ...generating(4),
  status: "DONE",
  summary: content,
});

const failed = (): SummaryResponse => ({
  ...generating(1),
  status: "FAILED",
});

function calledRequest(index = 0) {
  const [url, init] = fetchMock.mock.calls[index];
  return { url, init };
}

// 호출할 때마다 목록의 다음 응답을 돌려주고, 끝나면 마지막 응답을 반복합니다.
function respondInOrder(responses: SummaryResponse[]) {
  let index = 0;
  fetchMock.mockImplementation(async () => {
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return ok(response);
  });
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("요약지 요청", () => {
  it("조회는 GET /api/summaries/{summaryId}를 부른다", async () => {
    fetchMock.mockResolvedValueOnce(ok(done()));

    await expect(getSummary(summaryId)).resolves.toEqual(done());

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/summaries/${summaryId}`);
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("수정은 PATCH /api/summaries/{summaryId}에 보낸 필드만 본문으로 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok(done()));

    await updateSummary(summaryId, {
      mainSymptom: "OO 불편",
      onset: "OVER_WEEK",
      items: [{ order: 1, value: "있음" }],
    });

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/summaries/${summaryId}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      mainSymptom: "OO 불편",
      onset: "OVER_WEEK",
      items: [{ order: 1, value: "있음" }],
    });
  });

  it("수정할 때 건강 정보의 null(확인 못 함)과 [](없음)을 구분해 보낸다", async () => {
    fetchMock.mockResolvedValueOnce(ok(done()));

    await updateSummary(summaryId, {
      medications: null,
      conditions: [],
      allergies: [{ name: "OO", detail: "OO 설명" }],
      extraNote: null,
    });

    const body = JSON.parse(String(calledRequest().init.body));
    expect(body.medications).toBeNull();
    expect(body.conditions).toEqual([]);
    expect(body.allergies).toEqual([{ name: "OO", detail: "OO 설명" }]);
    expect(body.extraNote).toBeNull();
    expect("ageGroup" in body).toBe(false);
  });

  it("확인은 본문 없이 POST /api/summaries/{summaryId}/confirm을 부른다", async () => {
    const result = { summaryId, isConfirmed: true };
    fetchMock.mockResolvedValueOnce(ok(result));

    await expect(confirmSummary(summaryId)).resolves.toEqual(result);

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/summaries/${summaryId}/confirm`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("다시 만들기는 본문 없이 POST /api/intakes/{intakeId}/summary를 부른다", async () => {
    const result = { intakeId, summaryId, status: "GENERATING" };
    fetchMock.mockResolvedValueOnce(
      envelope(202, { isSuccess: true, code: "SUMMARY_202", result }),
    );

    await expect(retrySummary(intakeId)).resolves.toEqual(result);

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/intakes/${intakeId}/summary`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it.each([
    ["수정", () => updateSummary(summaryId, { mainSymptom: "OO" })],
    ["확인", () => confirmSummary(summaryId)],
  ])(
    "%s: 생성 중인 요약지는 SUMMARY_409 ApiError로 던진다",
    async (_n, call) => {
      fetchMock.mockResolvedValueOnce(fail(409, "SUMMARY_409"));

      const promise = call();

      await expect(promise).rejects.toBeInstanceOf(ApiError);
      await expect(promise).rejects.toMatchObject({ code: "SUMMARY_409" });
    },
  );
});

describe("응급 카드", () => {
  const card: EmergencyCardResponse = {
    intakeId,
    createdAt: "2026-11-04T10:00:00+09:00",
    userUtterance: "가슴이 답답해요",
    redFlagCategory: "CHEST_PAIN",
    mainSymptom: "가슴 답답함",
    onsetDetail: "오늘",
    ageGroup: "SEVENTIES",
    gender: "FEMALE",
    medications: [{ name: "OO약", detail: null }],
    conditions: [],
    allergies: null,
    guardian: { relation: "DAUGHTER", phoneNumber: "010-0000-0000" },
  };

  it("GET /api/intakes/{intakeId}/emergency-card를 본문 없이 부른다", async () => {
    fetchMock.mockResolvedValueOnce(ok(card));

    await expect(getEmergencyCard(intakeId)).resolves.toEqual(card);

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/intakes/${intakeId}/emergency-card`);
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("문진 ID를 경로에 안전하게 넣는다", async () => {
    fetchMock.mockResolvedValueOnce(ok(card));

    await getEmergencyCard("a/b");

    expect(calledRequest().url).toBe("/api/intakes/a%2Fb/emergency-card");
  });

  it("못 물은 항목의 null과 보호자 없음을 그대로 돌려준다", async () => {
    const unasked: EmergencyCardResponse = {
      ...card,
      mainSymptom: null,
      onsetDetail: null,
      ageGroup: null,
      gender: null,
      medications: null,
      conditions: null,
      allergies: null,
      guardian: null,
    };
    fetchMock.mockResolvedValueOnce(ok(unasked));

    await expect(getEmergencyCard(intakeId)).resolves.toEqual(unasked);
  });

  it("응급 전환되지 않은 문진은 SUMMARY_409 ApiError로 던진다", async () => {
    fetchMock.mockResolvedValueOnce(fail(409, "SUMMARY_409"));

    const promise = getEmergencyCard(intakeId);

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code: "SUMMARY_409" });
  });
});

describe("요약지 오류 분류", () => {
  it("SUMMARY_409만 충돌로 본다", () => {
    expect(isSummaryConflict(new ApiError("SUMMARY_409", "", 409))).toBe(true);
    expect(isSummaryConflict(new ApiError("INTAKE_409", "", 409))).toBe(false);
    expect(isSummaryConflict(new ApiError("SUMMARY_404", "", 404))).toBe(false);
    expect(isSummaryConflict(new Error("SUMMARY_409"))).toBe(false);
  });
});

describe("요약지 폴링", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("응답을 받으면 1초 뒤에 다음 요청을 보내고, DONE이면 끝낸다", async () => {
    respondInOrder([generating(0), generating(1), done()]);
    const onProgress = vi.fn();

    const promise = pollSummary(summaryId, { onProgress });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await expect(promise).resolves.toEqual({ kind: "done", summary: done() });
    expect(calledRequest(2).url).toBe(`/api/summaries/${summaryId}`);

    // 끝난 뒤에는 더 요청하지 않는다.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("진행 중인 steps를 응답마다 호출한 쪽에 전달한다", async () => {
    respondInOrder([generating(0), generating(2), done()]);
    const inProgressSteps: (string | undefined)[] = [];

    const promise = pollSummary(summaryId, {
      onProgress: (response) => {
        inProgressSteps.push(
          response.steps.find((item) => item.status === "IN_PROGRESS")?.step,
        );
      },
    });
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(inProgressSteps).toEqual(["BASIC_INFO", "HEALTH_INFO", undefined]);
  });

  it("요청이 끝나기 전에는 시간이 지나도 다음 요청을 보내지 않는다", async () => {
    let respondFirst: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (respondFirst = resolve)),
    );
    fetchMock.mockImplementation(async () => ok(done()));

    const promise = pollSummary(summaryId);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    respondFirst(ok(generating(0)));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await expect(promise).resolves.toMatchObject({ kind: "done" });
  });

  it("FAILED면 멈추고 다시 만들기 안내(failed)로 돌려준다", async () => {
    respondInOrder([generating(0), failed()]);

    const promise = pollSummary(summaryId);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual({
      kind: "needsRetry",
      reason: "failed",
      last: failed(),
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("30초가 되면 다시 만들기 안내(timeout)로 돌려주고 마지막 응답을 함께 준다", async () => {
    respondInOrder([generating(1)]);
    let settled = false;

    const promise = pollSummary(summaryId);
    void promise.then(() => (settled = true));

    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual({
      kind: "needsRetry",
      reason: "timeout",
      last: generating(1),
    });

    const callCount = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(callCount);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("응답이 오지 않아도 30초에 진행 중인 요청을 취소하고 timeout으로 끝낸다", async () => {
    let requestSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init.signal;
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    let settled = false;

    const promise = pollSummary(summaryId);
    void promise.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled).toBe(false);
    expect(requestSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    await expect(promise).resolves.toEqual({
      kind: "needsRetry",
      reason: "timeout",
      last: undefined,
    });
    expect(requestSignal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("취소에 반응하지 않는 요청이 있어도 30초에 끝나고, 늦게 온 DONE은 쓰지 않는다", async () => {
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve(ok(done())), 31_000);
        }),
    );

    const promise = pollSummary(summaryId);
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(promise).resolves.toMatchObject({
      kind: "needsRetry",
      reason: "timeout",
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("두 번째 요청이 멈춰도 30초에 timeout으로 끝내고 직전 응답을 준다", async () => {
    fetchMock.mockImplementationOnce(async () => ok(generating(2)));
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const promise = pollSummary(summaryId);
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(promise).resolves.toEqual({
      kind: "needsRetry",
      reason: "timeout",
      last: generating(2),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("DONE인데 summary가 null이면 done이 아니라 INVALID_RESPONSE를 던진다", async () => {
    respondInOrder([{ ...done(), summary: null }]);

    const promise = pollSummary(summaryId);
    const assertion = expect(promise).rejects.toMatchObject({
      name: "ApiError",
      code: INVALID_RESPONSE,
    });
    await vi.advanceTimersByTimeAsync(0);

    await assertion;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ["DONE", [generating(0), done()]],
    ["FAILED", [generating(0), failed()]],
    ["오류", null],
  ])(
    "%s로 끝나면 타이머와 abort 리스너를 남기지 않는다",
    async (_name, responses) => {
      if (responses) respondInOrder(responses);
      else fetchMock.mockResolvedValueOnce(fail(404, "SUMMARY_404"));
      const controller = new AbortController();
      const added: EventListenerOrEventListenerObject[] = [];
      const removed: EventListenerOrEventListenerObject[] = [];
      const addListener = controller.signal.addEventListener.bind(
        controller.signal,
      );
      const removeListener = controller.signal.removeEventListener.bind(
        controller.signal,
      );
      vi.spyOn(controller.signal, "addEventListener").mockImplementation(
        (type, listener, options) => {
          if (type === "abort" && listener) added.push(listener);
          addListener(type, listener, options);
        },
      );
      vi.spyOn(controller.signal, "removeEventListener").mockImplementation(
        (type, listener, options) => {
          if (type === "abort" && listener) removed.push(listener);
          removeListener(type, listener, options);
        },
      );

      const promise = pollSummary(summaryId, { signal: controller.signal });
      const settled = promise.then(
        () => undefined,
        () => undefined,
      );
      await vi.advanceTimersByTimeAsync(1000);
      await settled;

      expect(vi.getTimerCount()).toBe(0);
      expect(added.length).toBeGreaterThan(0);
      for (const listener of added) expect(removed).toContain(listener);
    },
  );

  it("기다리는 중에 중단하면 reject하고 더 요청하지 않는다", async () => {
    respondInOrder([generating(0)]);
    const controller = new AbortController();

    const promise = pollSummary(summaryId, { signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    controller.abort();
    await assertion;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("요청 중에 중단하면 reject하고 더 요청하지 않는다", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const promise = pollSummary(summaryId, { signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await assertion;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["DONE", [done()]],
    ["FAILED", [failed()]],
    ["GENERATING", [generating(0)]],
  ])(
    "%s를 받은 onProgress 안에서 abort하면 결과 대신 reject하고 더 요청하지 않는다",
    async (_name, responses) => {
      respondInOrder(responses);
      const controller = new AbortController();

      const promise = pollSummary(summaryId, {
        signal: controller.signal,
        onProgress: () => controller.abort(),
      });
      const assertion = expect(promise).rejects.toMatchObject({
        name: "AbortError",
      });
      await vi.advanceTimersByTimeAsync(0);

      await assertion;
      await vi.advanceTimersByTimeAsync(10_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("이미 중단된 signal이면 요청하지 않고 reject한다", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      pollSummary(summaryId, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("조회가 실패하면 폴링을 멈추고 ApiError를 던진다", async () => {
    fetchMock.mockResolvedValueOnce(fail(404, "SUMMARY_404"));

    const promise = pollSummary(summaryId);
    const assertion = expect(promise).rejects.toMatchObject({
      code: "SUMMARY_404",
    });
    await vi.advanceTimersByTimeAsync(0);

    await assertion;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
