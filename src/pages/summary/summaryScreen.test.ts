import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR, SERVER_ERROR_MESSAGE } from "@/api/errors";
import {
  confirmSummary,
  getSummary,
  updateSummary,
  type SummaryContent,
  type SummaryResponse,
} from "@/api/summaries";
import { initialEdits, newHealthEntry } from "@/pages/summary/editSummary";
import {
  createSummaryScreen,
  type SummaryScreenExit,
  type SummaryScreenView,
} from "@/pages/summary/summaryScreen";
import { sampleSummary } from "@/stores/fixtures";
import {
  clearSummarySession,
  readSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";

vi.mock("@/api/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/summaries")>()),
  getSummary: vi.fn(),
  updateSummary: vi.fn(),
  confirmSummary: vi.fn(),
}));

// 모든 값은 가짜 데이터입니다.
const session = { intakeId: "intake-1", summaryId: "summary-1" };
const getMock = vi.mocked(getSummary);
const updateMock = vi.mocked(updateSummary);
const confirmMock = vi.mocked(confirmSummary);

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
  summary: SummaryContent | null = null,
  createdAt = "2026-11-04T10:00:00+09:00",
): SummaryResponse {
  return {
    summaryId: session.summaryId,
    intakeId: session.intakeId,
    status,
    steps: [],
    summary,
    createdAt,
  };
}

const done = (summary: SummaryContent = sampleSummary) =>
  response("DONE", summary);

function apiError(code: string, status: number, result: unknown = null) {
  return new ApiError(code, "서버 안내 문장", status, result);
}

interface Harness {
  views: SummaryScreenView[];
  exits: SummaryScreenExit[];
  screen: ReturnType<typeof createSummaryScreen>;
  last: () => SummaryScreenView;
}

function setup(): Harness {
  const views: SummaryScreenView[] = [];
  const exits: SummaryScreenExit[] = [];
  const screen = createSummaryScreen({
    onView: (view) => views.push(view),
    onExit: (to) => exits.push(to),
  });
  return { views, exits, screen, last: () => views[views.length - 1] };
}

// 요약지를 불러와 보여 주는 상태까지 만듭니다.
async function loaded(summary: SummaryContent = sampleSummary) {
  getMock.mockResolvedValue(done(summary));
  const harness = setup();
  await harness.screen.load();
  return harness;
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
  getMock.mockReset();
  updateMock.mockReset();
  confirmMock.mockReset();
});

afterEach(() => {
  clearSummarySession();
  vi.unstubAllGlobals();
});

describe("S06 불러오기", () => {
  it("세션이 없으면 요청하지 않고 처음(/)으로 보낸다", async () => {
    clearSummarySession();
    const { screen, exits } = setup();

    await screen.load();

    expect(exits).toEqual(["start"]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("DONE이면 서버의 요약지와 작성 시각을 보여 준다", async () => {
    getMock.mockResolvedValue(
      response("DONE", sampleSummary, "2026-11-01T09:30:00+09:00"),
    );
    const { screen, views, last, exits } = setup();

    const loading = screen.load();
    // 응답이 오기 전에는 불러오는 중으로만 보입니다.
    expect(views.every((view) => view.phase === "loading")).toBe(true);
    await loading;

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock.mock.calls[0][0]).toBe("summary-1");
    expect(last()).toMatchObject({
      phase: "ready",
      session,
      summary: sampleSummary,
      createdAt: "2026-11-01T09:30:00+09:00",
      editing: false,
      busy: null,
    });
    expect(exits).toEqual([]);
  });

  it.each(["GENERATING", "FAILED"] as const)(
    "%s면 만드는 중 화면(/summary-loading)으로 보내고 기억한 ID는 둔다",
    async (status) => {
      getMock.mockResolvedValue(response(status));
      const { screen, exits, last } = setup();

      await screen.load();

      expect(exits).toEqual(["loading"]);
      expect(last().phase).not.toBe("ready");
      expect(readSummarySession()).toEqual(session);
    },
  );

  it("DONE인데 요약지 내용이 없으면 안내를 보여 준다", async () => {
    getMock.mockResolvedValue(response("DONE", null));
    const { screen, last, exits } = setup();

    await screen.load();

    expect(last()).toMatchObject({
      phase: "error",
      message: SERVER_ERROR_MESSAGE,
    });
    expect(exits).toEqual([]);
  });

  it.each([
    ["INTAKE_403", 403],
    ["INTAKE_404", 404],
    ["SUMMARY_403", 403],
    ["SUMMARY_404", 404],
  ])("%s이면 기억한 ID를 지우고 처음(/)으로 보낸다", async (code, status) => {
    getMock.mockRejectedValue(apiError(code, status));
    const { screen, exits, views } = setup();

    await screen.load();

    expect(exits).toEqual(["start"]);
    expect(readSummarySession()).toBeNull();
    expect(views.some((view) => view.phase === "error")).toBe(false);
  });

  it("SUMMARY_409면 만드는 중 화면으로 보낸다", async () => {
    getMock.mockRejectedValue(apiError("SUMMARY_409", 409));
    const { screen, exits } = setup();

    await screen.load();

    expect(exits).toEqual(["loading"]);
  });

  it("네트워크 오류면 안내를 보여 주고, 다시 불러오면 이어진다", async () => {
    getMock.mockRejectedValueOnce(new ApiError(NETWORK_ERROR, "", 0));
    getMock.mockResolvedValueOnce(done());
    const { screen, last, exits } = setup();

    await screen.load();

    expect(last()).toMatchObject({
      phase: "error",
      message: SERVER_ERROR_MESSAGE,
    });
    expect(exits).toEqual([]);
    expect(readSummarySession()).toEqual(session);

    await screen.load();

    expect(last()).toMatchObject({ phase: "ready", message: null });
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});

describe("S06 화면을 떠날 때", () => {
  it("진행 중인 요청을 취소(abort)하고 오류 안내를 띄우지 않는다", async () => {
    let signal: AbortSignal | undefined;
    getMock.mockImplementation((_id, requestSignal) => {
      signal = requestSignal;
      return new Promise<SummaryResponse>((_resolve, reject) => {
        requestSignal?.addEventListener("abort", () =>
          reject(requestSignal.reason),
        );
      });
    });
    const { screen, views, exits } = setup();
    const loading = screen.load();
    await vi.waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(signal?.aborted).toBe(false);
    const viewCount = views.length;

    screen.dispose();
    await loading;

    expect(signal?.aborted).toBe(true);
    expect(views).toHaveLength(viewCount);
    expect(exits).toEqual([]);
  });

  it("떠난 뒤에 도착한 응답으로는 이동하지 않는다", async () => {
    const pending = deferred<SummaryResponse>();
    getMock.mockReturnValue(pending.promise);
    const { screen, exits, views } = setup();
    const loading = screen.load();
    await vi.waitFor(() => expect(getMock).toHaveBeenCalled());
    const viewCount = views.length;

    screen.dispose();
    pending.resolve(response("GENERATING"));
    await loading;

    expect(exits).toEqual([]);
    expect(views).toHaveLength(viewCount);
  });
});

describe("S06 내용이 맞아요", () => {
  it("서버가 성공을 알린 뒤에만 확인된 상태로 바꾼다", async () => {
    const { screen, last } = await loaded();
    const confirming = deferred<Awaited<ReturnType<typeof confirmSummary>>>();
    confirmMock.mockReturnValue(confirming.promise);

    const request = screen.confirm();

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(confirmMock.mock.calls[0][0]).toBe("summary-1");
    // 요청 중에는 아직 확인된 상태가 아니고 버튼은 잠긴다.
    expect(last().busy).toBe("confirm");
    expect(last().summary?.isConfirmed).toBe(false);

    confirming.resolve({ summaryId: "summary-1", isConfirmed: true });
    await request;

    expect(last().busy).toBeNull();
    expect(last().summary?.isConfirmed).toBe(true);
    expect(last().confirmMessage).toBeNull();
  });

  it("실패하면 확인된 상태로 바꾸지 않고 안내를 보여 준다", async () => {
    const { screen, last, exits } = await loaded();
    confirmMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));

    await screen.confirm();

    expect(last()).toMatchObject({
      phase: "ready",
      busy: null,
      confirmMessage: SERVER_ERROR_MESSAGE,
    });
    expect(last().summary?.isConfirmed).toBe(false);
    expect(exits).toEqual([]);
  });

  it("실패한 뒤 다시 누르면 성공하고 안내가 사라진다", async () => {
    const { screen, last } = await loaded();
    confirmMock.mockRejectedValueOnce(apiError("SUMMARY_500", 500));
    confirmMock.mockResolvedValueOnce({
      summaryId: "summary-1",
      isConfirmed: true,
    });

    await screen.confirm();
    expect(last().confirmMessage).not.toBeNull();
    await screen.confirm();

    expect(last().confirmMessage).toBeNull();
    expect(last().summary?.isConfirmed).toBe(true);
  });

  it("연달아 눌러도 한 번만 요청한다", async () => {
    const { screen } = await loaded();
    const confirming = deferred<Awaited<ReturnType<typeof confirmSummary>>>();
    confirmMock.mockReturnValue(confirming.promise);

    const first = screen.confirm();
    const second = screen.confirm();
    confirming.resolve({ summaryId: "summary-1", isConfirmed: true });
    await Promise.all([first, second]);

    expect(confirmMock).toHaveBeenCalledTimes(1);
  });

  it("이미 확인한 요약지는 다시 요청하지 않는다", async () => {
    const { screen } = await loaded({ ...sampleSummary, isConfirmed: true });

    await screen.confirm();

    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("SUMMARY_409면 만드는 중 화면으로, 404면 처음으로 보낸다", async () => {
    const first = await loaded();
    confirmMock.mockRejectedValueOnce(apiError("SUMMARY_409", 409));
    await first.screen.confirm();
    expect(first.exits).toEqual(["loading"]);

    const second = await loaded();
    confirmMock.mockRejectedValueOnce(apiError("SUMMARY_404", 404));
    await second.screen.confirm();
    expect(second.exits).toEqual(["start"]);
    expect(readSummarySession()).toBeNull();
  });

  it("수정 폼을 열어 둔 동안에는 요청하지 않는다", async () => {
    const { screen } = await loaded();
    screen.startEdit();

    await screen.confirm();

    expect(confirmMock).not.toHaveBeenCalled();
  });
});

describe("S06 수정 저장", () => {
  it("바꾼 칸만 보내고, 서버가 돌려준 요약지로 화면을 바꾼다", async () => {
    const { screen, last } = await loaded({
      ...sampleSummary,
      isConfirmed: true,
    });
    screen.startEdit();
    const edits = {
      ...initialEdits(last().summary as SummaryContent),
      mainSymptom: " 오른쪽 무릎 통증 ",
    };
    const saved: SummaryContent = {
      ...sampleSummary,
      mainSymptom: "오른쪽 무릎 통증",
      isConfirmed: false,
    };
    updateMock.mockResolvedValue({
      ...response("DONE", saved, "2026-11-04T10:00:00+09:00"),
    });

    await screen.save(edits);

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0]).toBe("summary-1");
    expect(updateMock.mock.calls[0][1]).toEqual({
      mainSymptom: "오른쪽 무릎 통증",
    });
    expect(last()).toMatchObject({
      editing: false,
      busy: null,
      saveMessage: null,
      summary: saved,
    });
    // 서버가 돌려준 isConfirmed(false)를 그대로 따른다.
    expect(last().summary?.isConfirmed).toBe(false);
  });

  it("null(지움·확인 못 함)과 빈 배열(없음)을 구분해 보낸다", async () => {
    const withNote = { ...sampleSummary, extraNote: "밤에 더 아파요" };
    const { screen, last } = await loaded(withNote);
    screen.startEdit();
    const edits = initialEdits(withNote);
    edits.extraNote = "";
    edits.health.allergies = [];
    edits.itemValues = { 1: "", 2: "없음" };
    updateMock.mockResolvedValue(done());

    await screen.save(edits);

    expect(updateMock.mock.calls[0][1]).toEqual({
      extraNote: null,
      allergies: [],
      items: [{ order: 1, value: null }],
    });
    expect(last().editing).toBe(false);
  });

  it("건강 정보를 새로 넣으면 그 종류만 통째로 보낸다", async () => {
    const unasked = { ...sampleSummary, conditions: null };
    const { screen } = await loaded(unasked);
    screen.startEdit();
    const edits = initialEdits(unasked);
    edits.health.conditions = [newHealthEntry("고혈압", "")];
    updateMock.mockResolvedValue(done());

    await screen.save(edits);

    expect(updateMock.mock.calls[0][1]).toEqual({
      conditions: [{ name: "고혈압", detail: null }],
    });
  });

  it("실패하면 수정 폼을 열어 둔 채 요약지는 그대로 두고 안내한다", async () => {
    const { screen, last, exits } = await loaded();
    screen.startEdit();
    const edits = { ...initialEdits(sampleSummary), mainSymptom: "OO 불편" };
    updateMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));

    await screen.save(edits);

    expect(last()).toMatchObject({
      editing: true,
      busy: null,
      saveMessage: SERVER_ERROR_MESSAGE,
      saveFieldErrors: [],
      summary: sampleSummary,
    });
    expect(exits).toEqual([]);
  });

  it("400에 errors가 비어 있어도 서버 문장으로 안내하고 폼을 유지한다", async () => {
    const { screen, last } = await loaded();
    screen.startEdit();
    updateMock.mockRejectedValue(apiError("SUMMARY_400", 400, { errors: [] }));

    await screen.save({ ...initialEdits(sampleSummary), mainSymptom: "OO" });

    expect(last()).toMatchObject({
      editing: true,
      saveMessage: "서버 안내 문장",
      saveFieldErrors: [],
    });
  });

  it("400의 항목별 이유를 함께 담는다", async () => {
    const { screen, last } = await loaded();
    screen.startEdit();
    const errors = [
      { field: "mainSymptom", reason: "100자 이하로 써 주세요." },
    ];
    updateMock.mockRejectedValue(apiError("SUMMARY_400", 400, { errors }));

    await screen.save({ ...initialEdits(sampleSummary), mainSymptom: "OO" });

    expect(last()).toMatchObject({
      editing: true,
      saveMessage: "서버 안내 문장",
      saveFieldErrors: errors,
    });
  });

  it("실패한 뒤 다시 저장하면 성공하고 안내가 사라진다", async () => {
    const { screen, last } = await loaded();
    screen.startEdit();
    const edits = { ...initialEdits(sampleSummary), mainSymptom: "OO 불편" };
    updateMock.mockRejectedValueOnce(apiError("SUMMARY_500", 500));
    updateMock.mockResolvedValueOnce(
      done({ ...sampleSummary, mainSymptom: "OO 불편" }),
    );

    await screen.save(edits);
    expect(last().saveMessage).not.toBeNull();
    await screen.save(edits);

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(last()).toMatchObject({ editing: false, saveMessage: null });
    expect(last().summary?.mainSymptom).toBe("OO 불편");
  });

  it("요청 중에는 버튼을 잠그고, 연달아 저장해도 한 번만 요청한다", async () => {
    const { screen, last } = await loaded();
    screen.startEdit();
    const edits = { ...initialEdits(sampleSummary), mainSymptom: "OO 불편" };
    const saving = deferred<SummaryResponse>();
    updateMock.mockReturnValue(saving.promise);

    const first = screen.save(edits);
    const second = screen.save(edits);
    expect(last().busy).toBe("save");
    // 저장 중에는 취소로 폼을 닫을 수 없다.
    screen.cancelEdit();
    expect(last().editing).toBe(true);
    saving.resolve(done({ ...sampleSummary, mainSymptom: "OO 불편" }));
    await Promise.all([first, second]);

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(last()).toMatchObject({ busy: null, editing: false });
  });

  it("바꾼 곳이 없으면 요청하지 않고 폼만 닫아 확인한 상태를 그대로 둔다", async () => {
    const { screen, last } = await loaded({
      ...sampleSummary,
      isConfirmed: true,
    });
    screen.startEdit();

    await screen.save(initialEdits(sampleSummary));

    expect(updateMock).not.toHaveBeenCalled();
    expect(last().editing).toBe(false);
    expect(last().summary?.isConfirmed).toBe(true);
  });

  it("주된 증상을 비우면 요청하지 않는다", async () => {
    const { screen, last } = await loaded();
    screen.startEdit();

    await screen.save({ ...initialEdits(sampleSummary), mainSymptom: "  " });

    expect(updateMock).not.toHaveBeenCalled();
    expect(last().editing).toBe(true);
  });

  it("수정 폼을 열지 않았으면 저장하지 않는다", async () => {
    const { screen } = await loaded();

    await screen.save({ ...initialEdits(sampleSummary), mainSymptom: "OO" });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("취소하면 폼을 닫고 안내를 지운다", async () => {
    const { screen, last } = await loaded();
    screen.startEdit();
    updateMock.mockRejectedValue(apiError("SUMMARY_500", 500));
    await screen.save({ ...initialEdits(sampleSummary), mainSymptom: "OO" });
    expect(last().saveMessage).not.toBeNull();

    screen.cancelEdit();

    expect(last()).toMatchObject({
      editing: false,
      saveMessage: null,
      saveFieldErrors: [],
    });
  });

  it("SUMMARY_409면 만드는 중 화면으로, 403이면 처음으로 보낸다", async () => {
    const first = await loaded();
    first.screen.startEdit();
    updateMock.mockRejectedValueOnce(apiError("SUMMARY_409", 409));
    await first.screen.save({
      ...initialEdits(sampleSummary),
      mainSymptom: "OO",
    });
    expect(first.exits).toEqual(["loading"]);

    const second = await loaded();
    second.screen.startEdit();
    updateMock.mockRejectedValueOnce(apiError("SUMMARY_403", 403));
    await second.screen.save({
      ...initialEdits(sampleSummary),
      mainSymptom: "OO",
    });
    expect(second.exits).toEqual(["start"]);
    expect(readSummarySession()).toBeNull();
  });

  it("응답에 요약지 내용이 없으면 안내하고 폼을 유지한다", async () => {
    const { screen, last } = await loaded();
    screen.startEdit();
    updateMock.mockResolvedValue(response("DONE", null));

    await screen.save({ ...initialEdits(sampleSummary), mainSymptom: "OO" });

    expect(last()).toMatchObject({
      editing: true,
      saveMessage: SERVER_ERROR_MESSAGE,
      summary: sampleSummary,
    });
  });

  it("떠난 뒤에는 저장 요청을 취소한다", async () => {
    const { screen } = await loaded();
    screen.startEdit();
    let signal: AbortSignal | undefined;
    updateMock.mockImplementation((_id, _request, requestSignal) => {
      signal = requestSignal;
      return new Promise<SummaryResponse>(() => {});
    });
    void screen.save({ ...initialEdits(sampleSummary), mainSymptom: "OO" });
    await vi.waitFor(() => expect(signal).toBeDefined());

    screen.dispose();

    expect(signal?.aborted).toBe(true);
  });
});
