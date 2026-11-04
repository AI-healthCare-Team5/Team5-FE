import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR, SERVER_ERROR_MESSAGE } from "@/api/errors";
import { cancelIntake } from "@/api/intakes";
import {
  pollSummary,
  retrySummary,
  type PollSummaryOptions,
  type SummaryContent,
  type SummaryPollResult,
  type SummaryResponse,
} from "@/api/summaries";
import {
  createSummaryLoading,
  type SummaryLoadingExit,
  type SummaryLoadingView,
} from "@/pages/summary-loading/summaryLoading";
import { sampleSummary } from "@/stores/fixtures";
import {
  clearSummarySession,
  readSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";

vi.mock("@/api/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/summaries")>()),
  pollSummary: vi.fn(),
  retrySummary: vi.fn(),
}));
vi.mock("@/api/intakes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/intakes")>()),
  cancelIntake: vi.fn(),
}));

// 모든 값은 가짜 데이터입니다.
const session = { intakeId: "intake-1", summaryId: "summary-1" };
const pollMock = vi.mocked(pollSummary);
const retryMock = vi.mocked(retrySummary);
const cancelMock = vi.mocked(cancelIntake);

function createStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

function response(
  status: SummaryResponse["status"],
  inProgress: number,
): SummaryResponse {
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
    summaryId: session.summaryId,
    intakeId: session.intakeId,
    status,
    steps,
    summary: null,
    createdAt: "2026-11-04T10:00:00+09:00",
  };
}

const generating = (inProgress: number) => response("GENERATING", inProgress);
const doneResult: SummaryPollResult = {
  kind: "done",
  summary: {
    ...response("DONE", 4),
    status: "DONE",
    summary: sampleSummary satisfies SummaryContent,
  },
};
const failedResult: SummaryPollResult = {
  kind: "needsRetry",
  reason: "failed",
  last: response("FAILED", 1),
};

function apiError(code: string, status: number) {
  return new ApiError(code, "서버 안내 문장", status);
}

interface Harness {
  views: SummaryLoadingView[];
  exits: SummaryLoadingExit[];
  loading: ReturnType<typeof createSummaryLoading>;
  last: () => SummaryLoadingView;
}

function setup(): Harness {
  const views: SummaryLoadingView[] = [];
  const exits: SummaryLoadingExit[] = [];
  const loading = createSummaryLoading({
    onView: (view) => views.push(view),
    onExit: (to) => exits.push(to),
  });
  return { views, exits, loading, last: () => views[views.length - 1] };
}

// 호출한 쪽이 결과를 정할 때까지 끝나지 않는 promise입니다.
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
  vi.stubGlobal("window", { sessionStorage: createStorage() });
  clearSummarySession();
  saveSummarySession(session);
  pollMock.mockReset();
  retryMock.mockReset();
  cancelMock.mockReset();
});

afterEach(() => {
  clearSummarySession();
  vi.unstubAllGlobals();
});

describe("S06a 세션", () => {
  it("세션이 없으면 조회하지 않고 처음(/)으로 보낸다", async () => {
    clearSummarySession();
    const { loading, exits } = setup();

    await loading.start();

    expect(exits).toEqual(["start"]);
    expect(pollMock).not.toHaveBeenCalled();
  });

  it("세션이 있으면 그 summaryId로 조회를 시작한다", async () => {
    pollMock.mockResolvedValue(doneResult);
    const { loading } = setup();

    await loading.start();

    expect(pollMock).toHaveBeenCalledTimes(1);
    expect(pollMock.mock.calls[0][0]).toBe("summary-1");
  });
});

describe("S06a 단계 표시와 완료", () => {
  it("응답이 올 때마다 서버가 알려 준 단계를 view에 담는다", async () => {
    pollMock.mockImplementation(async (_id, options) => {
      options?.onProgress?.(generating(0));
      options?.onProgress?.(generating(2));
      return doneResult;
    });
    const { loading, views } = setup();

    await loading.start();

    const inProgress = views
      .filter((view) => view.steps)
      .map(
        (view) =>
          view.steps?.find((item) => item.status === "IN_PROGRESS")?.step,
      );
    expect(inProgress).toEqual(["BASIC_INFO", "HEALTH_INFO"]);
    expect(views[0]).toMatchObject({ phase: "polling", steps: null });
  });

  it("DONE이면 /summary로 보내고 기억한 ID는 그대로 둔다", async () => {
    pollMock.mockResolvedValue(doneResult);
    const { loading, exits } = setup();

    await loading.start();

    expect(exits).toEqual(["summary"]);
    expect(readSummarySession()).toEqual(session);
  });
});

describe("S06a 다시 만들기 안내", () => {
  it("FAILED면 failed 안내로 바꾸고 마지막 단계를 남긴다", async () => {
    pollMock.mockResolvedValue(failedResult);
    const { loading, last, exits } = setup();

    await loading.start();

    expect(last()).toMatchObject({
      phase: "needsRetry",
      reason: "failed",
      busy: false,
    });
    expect(last().steps).toEqual(response("FAILED", 1).steps);
    expect(exits).toEqual([]);
  });

  it("30초가 지나면 timeout 안내로 바꾸고, 첫 응답 전이면 단계는 없다", async () => {
    pollMock.mockResolvedValue({ kind: "needsRetry", reason: "timeout" });
    const { loading, last } = setup();

    await loading.start();

    expect(last()).toMatchObject({
      phase: "needsRetry",
      reason: "timeout",
      steps: null,
    });
  });

  it("timeout이어도 이미 받은 단계는 그대로 둔다", async () => {
    pollMock.mockImplementation(async (_id, options) => {
      options?.onProgress?.(generating(1));
      return { kind: "needsRetry", reason: "timeout" };
    });
    const { loading, last } = setup();

    await loading.start();

    expect(last().steps).toEqual(generating(1).steps);
  });

  it("다시 만들기: retrySummary 뒤 같은 summaryId로 다시 조회하고 DONE이면 이동한다", async () => {
    pollMock.mockResolvedValueOnce(failedResult);
    pollMock.mockResolvedValueOnce(doneResult);
    retryMock.mockResolvedValue({
      ...session,
      status: "GENERATING",
    });
    const { loading, exits, views } = setup();
    await loading.start();

    await loading.retry();

    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(retryMock.mock.calls[0][0]).toBe("intake-1");
    expect(pollMock).toHaveBeenCalledTimes(2);
    expect(pollMock.mock.calls[1][0]).toBe("summary-1");
    expect(retryMock.mock.invocationCallOrder[0]).toBeLessThan(
      pollMock.mock.invocationCallOrder[1],
    );
    expect(exits).toEqual(["summary"]);
    // 다시 만드는 동안 이전 단계 표시를 지우고, 요청 중에는 버튼을 잠근다.
    const afterRetry = views.slice(views.findIndex((v) => v.busy));
    expect(afterRetry[0]).toMatchObject({
      phase: "polling",
      steps: null,
      busy: true,
    });
    expect(afterRetry.at(-1)?.busy).toBe(false);
  });

  it("다시 만들기가 SUMMARY_409면 오류로 보지 않고 폴링을 이어 간다", async () => {
    pollMock.mockResolvedValueOnce({ kind: "needsRetry", reason: "timeout" });
    pollMock.mockResolvedValueOnce(doneResult);
    retryMock.mockRejectedValue(apiError("SUMMARY_409", 409));
    const { loading, exits, views } = setup();
    await loading.start();

    await loading.retry();

    expect(pollMock).toHaveBeenCalledTimes(2);
    expect(exits).toEqual(["summary"]);
    expect(views.some((view) => view.phase === "error")).toBe(false);
  });

  it("다시 만들기를 연달아 눌러도 한 번만 요청한다", async () => {
    pollMock.mockResolvedValueOnce(failedResult);
    const retrying = deferred<Awaited<ReturnType<typeof retrySummary>>>();
    retryMock.mockReturnValue(retrying.promise);
    pollMock.mockResolvedValueOnce(doneResult);
    const { loading } = setup();
    await loading.start();

    const first = loading.retry();
    const second = loading.retry();
    retrying.resolve({ ...session, status: "GENERATING" });
    await Promise.all([first, second]);

    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(pollMock).toHaveBeenCalledTimes(2);
  });

  it("다시 만들기 요청이 실패하면 안내하고, 다시 시도는 그 요청부터 다시 보낸다", async () => {
    pollMock.mockResolvedValueOnce(failedResult);
    pollMock.mockResolvedValueOnce(doneResult);
    retryMock.mockRejectedValueOnce(new ApiError(NETWORK_ERROR, "", 0));
    retryMock.mockResolvedValueOnce({ ...session, status: "GENERATING" });
    const { loading, last, exits } = setup();
    await loading.start();

    await loading.retry();

    expect(last()).toMatchObject({
      phase: "error",
      message: SERVER_ERROR_MESSAGE,
      busy: false,
    });
    expect(pollMock).toHaveBeenCalledTimes(1);

    await loading.retry();

    expect(retryMock).toHaveBeenCalledTimes(2);
    expect(pollMock).toHaveBeenCalledTimes(2);
    expect(exits).toEqual(["summary"]);
  });
});

describe("S06a 조회 실패", () => {
  it.each([
    ["INTAKE_403", 403],
    ["INTAKE_404", 404],
    ["SUMMARY_403", 403],
    ["SUMMARY_404", 404],
  ])("%s이면 기억한 ID를 지우고 처음(/)으로 보낸다", async (code, status) => {
    pollMock.mockRejectedValue(apiError(code, status));
    const { loading, exits, views } = setup();

    await loading.start();

    expect(exits).toEqual(["start"]);
    expect(readSummarySession()).toBeNull();
    expect(views.some((view) => view.phase === "error")).toBe(false);
  });

  it("네트워크 오류면 안내를 보여 주고 다시 시도는 조회만 다시 한다", async () => {
    pollMock.mockRejectedValueOnce(new ApiError(NETWORK_ERROR, "", 0));
    pollMock.mockResolvedValueOnce(doneResult);
    const { loading, last, exits } = setup();

    await loading.start();

    expect(last()).toMatchObject({
      phase: "error",
      message: SERVER_ERROR_MESSAGE,
    });
    expect(exits).toEqual([]);
    expect(readSummarySession()).toEqual(session);

    await loading.retry();

    expect(retryMock).not.toHaveBeenCalled();
    expect(pollMock).toHaveBeenCalledTimes(2);
    expect(exits).toEqual(["summary"]);
  });

  it("서버가 준 문장이 있으면 그대로 안내한다", async () => {
    pollMock.mockRejectedValue(apiError("SUMMARY_400", 400));
    const { loading, last } = setup();

    await loading.start();

    expect(last()).toMatchObject({
      phase: "error",
      message: "서버 안내 문장",
    });
  });
});

describe("S06a 취소", () => {
  it("취소하면 문진을 지우고 기억한 ID를 지운 뒤 처음(/)으로 보낸다", async () => {
    const polling = deferred<SummaryPollResult>();
    pollMock.mockReturnValue(polling.promise);
    cancelMock.mockResolvedValue({
      intakeId: "intake-1",
      status: "CANCELED",
    });
    const { loading, exits } = setup();
    void loading.start();
    await vi.waitFor(() => expect(pollMock).toHaveBeenCalled());

    await loading.cancel();

    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(cancelMock.mock.calls[0][0]).toBe("intake-1");
    expect(readSummarySession()).toBeNull();
    expect(exits).toEqual(["start"]);
  });

  it("취소하는 동안 조회를 멈춘다", async () => {
    let signal: AbortSignal | undefined;
    pollMock.mockImplementation((_id, options?: PollSummaryOptions) => {
      signal = options?.signal;
      return new Promise<SummaryPollResult>(() => {});
    });
    cancelMock.mockResolvedValue({
      intakeId: "intake-1",
      status: "CANCELED",
    });
    const { loading } = setup();
    void loading.start();
    await vi.waitFor(() => expect(signal).toBeDefined());

    const canceling = loading.cancel();
    expect(signal?.aborted).toBe(true);
    await canceling;
  });

  it.each([
    ["INTAKE_403", 403],
    ["INTAKE_404", 404],
  ])(
    "이미 없는 문진(%s)이어도 처음(/)으로 보내고 ID를 지운다",
    async (code, status) => {
      pollMock.mockResolvedValue(failedResult);
      cancelMock.mockRejectedValue(apiError(code, status));
      const { loading, exits, last } = setup();
      await loading.start();

      await loading.cancel();

      expect(exits).toEqual(["start"]);
      expect(readSummarySession()).toBeNull();
      expect(last().cancelMessage).toBeNull();
    },
  );

  it("그 밖의 취소 오류는 안내를 보여 주고 화면에 머문다", async () => {
    pollMock.mockResolvedValue(failedResult);
    cancelMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));
    const { loading, exits, last } = setup();
    await loading.start();

    await loading.cancel();

    expect(last()).toMatchObject({
      phase: "needsRetry",
      busy: false,
      cancelMessage: SERVER_ERROR_MESSAGE,
    });
    expect(exits).toEqual([]);
    expect(readSummarySession()).toEqual(session);
  });

  it("만드는 중에 취소가 실패하면 조회를 다시 이어 간다", async () => {
    pollMock.mockImplementationOnce(
      () => new Promise<SummaryPollResult>(() => {}),
    );
    pollMock.mockResolvedValueOnce(doneResult);
    cancelMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));
    const { loading, exits, last } = setup();
    void loading.start();
    await vi.waitFor(() => expect(pollMock).toHaveBeenCalledTimes(1));

    await loading.cancel();

    await vi.waitFor(() => expect(exits).toEqual(["summary"]));
    expect(pollMock).toHaveBeenCalledTimes(2);
    expect(last().cancelMessage).toBe(SERVER_ERROR_MESSAGE);
  });

  it("취소를 연달아 눌러도 한 번만 요청한다", async () => {
    pollMock.mockResolvedValue(failedResult);
    const canceling = deferred<Awaited<ReturnType<typeof cancelIntake>>>();
    cancelMock.mockReturnValue(canceling.promise);
    const { loading, exits, last } = setup();
    await loading.start();

    const first = loading.cancel();
    const second = loading.cancel();
    expect(last().busy).toBe(true);
    canceling.resolve({ intakeId: "intake-1", status: "CANCELED" });
    await Promise.all([first, second]);

    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(exits).toEqual(["start"]);
  });
});

describe("S06a 화면을 떠날 때", () => {
  it("조회를 취소(abort)한다", async () => {
    let signal: AbortSignal | undefined;
    pollMock.mockImplementation((_id, options?: PollSummaryOptions) => {
      signal = options?.signal;
      return new Promise<SummaryPollResult>(() => {});
    });
    const { loading } = setup();
    void loading.start();
    await vi.waitFor(() => expect(signal).toBeDefined());
    expect(signal?.aborted).toBe(false);

    loading.dispose();

    expect(signal?.aborted).toBe(true);
  });

  it("취소된 조회가 던진 AbortError는 오류 안내가 되지 않는다", async () => {
    pollMock.mockImplementation((_id, options?: PollSummaryOptions) => {
      return new Promise<SummaryPollResult>((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(options.signal?.reason),
        );
      });
    });
    const { loading, views, exits } = setup();
    const started = loading.start();
    await vi.waitFor(() => expect(pollMock).toHaveBeenCalled());
    const viewCount = views.length;

    loading.dispose();
    await started;

    expect(views).toHaveLength(viewCount);
    expect(exits).toEqual([]);
  });

  it("떠난 뒤에 도착한 결과로는 이동하지 않는다", async () => {
    const polling = deferred<SummaryPollResult>();
    pollMock.mockReturnValue(polling.promise);
    const { loading, exits } = setup();
    const started = loading.start();
    await vi.waitFor(() => expect(pollMock).toHaveBeenCalled());

    loading.dispose();
    polling.resolve(doneResult);
    await started;

    expect(exits).toEqual([]);
  });
});
