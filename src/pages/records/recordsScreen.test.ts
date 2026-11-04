import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, SERVER_ERROR_MESSAGE } from "@/api/errors";
import {
  deleteRecord,
  listRecords,
  type RecordListItem,
  type RecordListResult,
} from "@/api/records";
import {
  createRecordsScreen,
  mergeRecords,
  nextPageOf,
  type RecordsExit,
  type RecordsView,
} from "@/pages/records/recordsScreen";
import { appActions } from "@/stores/appStore";
import { loadMember } from "@/stores/memberSession";

vi.mock("@/api/records", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/records")>()),
  listRecords: vi.fn(),
  deleteRecord: vi.fn(),
}));
vi.mock("@/stores/memberSession", () => ({ loadMember: vi.fn() }));

// 실제 백엔드가 아니라 API 함수를 가짜로 바꿔 화면 동작을 확인합니다. 모든 값은 가짜 데이터입니다.
const listMock = vi.mocked(listRecords);
const deleteMock = vi.mocked(deleteRecord);
const memberMock = vi.mocked(loadMember);

function item(id: number): RecordListItem {
  return {
    medicalRecordId: id,
    createdAt: "2026-10-16T14:25:00+09:00",
    departmentName: "정형외과",
    mainSymptom: `증상 ${id}`,
    subtitle: `서버 부제 ${id}`,
  };
}

function page(
  pageNumber: number,
  ids: number[],
  hasNext: boolean,
): RecordListResult {
  return {
    page: pageNumber,
    size: 20,
    totalCount: ids.length,
    hasNext,
    records: ids.map(item),
  };
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

function apiError(code: string, result: unknown = null) {
  return new ApiError(code, "서버 안내 문장", Number(code.slice(-3)), result);
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

function setup() {
  const views: RecordsView[] = [];
  const exits: RecordsExit[] = [];
  const screen = createRecordsScreen({
    onView: (view) => views.push(view),
    onExit: (to) => exits.push(to),
  });
  return { views, exits, screen, last: () => views[views.length - 1] };
}

beforeEach(() => {
  listMock.mockReset();
  deleteMock.mockReset();
  memberMock.mockReset();
  appActions.logout();
  appActions.completeLogin(
    { nickname: "봄날", needsRecordConsent: false },
    { returnTo: "/records", saveTarget: null },
  );
});

describe("페이지 이어 붙이기", () => {
  it("이미 있는 기록은 건너뛰고 순서를 지킨다", () => {
    expect(
      mergeRecords([item(3), item(2)], [item(2), item(1)]).map(
        (record) => record.medicalRecordId,
      ),
    ).toEqual([3, 2, 1]);
  });

  it("다음 페이지는 불러온 기록 끝이 속한 페이지다", () => {
    expect(nextPageOf(0, 20)).toBe(0);
    expect(nextPageOf(20, 20)).toBe(1);
    expect(nextPageOf(40, 20)).toBe(2);
    // 한 건 지워서 19건이 남았으면 앞으로 당겨진 한 건을 받으려고 0쪽부터 다시 받는다
    expect(nextPageOf(19, 20)).toBe(0);
  });
});

describe("H01 불러오기", () => {
  it("로그인한 상태면 로그인 확인 없이 0쪽을 받아 서버 subtitle 그대로 보여 준다", async () => {
    listMock.mockResolvedValue(page(0, [3, 2, 1], false));
    const { screen, last } = setup();

    await screen.load();

    expect(memberMock).not.toHaveBeenCalled();
    expect(listMock).toHaveBeenCalledWith(
      { page: 0, size: 20 },
      expect.any(AbortSignal),
    );
    expect(last().phase).toBe("ready");
    expect(last().records.map((record) => record.subtitle)).toEqual([
      "서버 부제 3",
      "서버 부제 2",
      "서버 부제 1",
    ]);
    expect(last().hasNext).toBe(false);
  });

  it("새로고침해서 로그인 상태가 없으면 서버에 확인한 뒤 받는다", async () => {
    appActions.logout();
    memberMock.mockResolvedValue("loggedIn");
    listMock.mockResolvedValue(page(0, [1], false));
    const { screen, last } = setup();

    await screen.load();

    expect(memberMock).toHaveBeenCalledTimes(1);
    expect(last().phase).toBe("ready");
  });

  it("서버가 로그인하지 않았다고 하면 목록을 요청하지 않고 로그인으로 보낸다", async () => {
    appActions.logout();
    memberMock.mockResolvedValue("loggedOut");
    const { screen, exits } = setup();

    await screen.load();

    expect(listMock).not.toHaveBeenCalled();
    expect(exits).toEqual(["login"]);
  });

  it("목록 요청이 AUTH_401이면 로그아웃된 것으로 바꾸고 로그인으로 보낸다", async () => {
    listMock.mockRejectedValue(apiError("AUTH_401"));
    const { screen, exits } = setup();

    await screen.load();

    expect(exits).toEqual(["login"]);
  });

  it("서버 오류는 공통 안내를 보여 주고 다시 시도하면 불러온다", async () => {
    listMock.mockRejectedValueOnce(apiError("SUMMARY_500"));
    const { screen, last } = setup();

    await screen.load();
    expect(last()).toMatchObject({
      phase: "error",
      message: SERVER_ERROR_MESSAGE,
    });

    listMock.mockResolvedValueOnce(page(0, [1], false));
    await screen.load();
    expect(last()).toMatchObject({ phase: "ready", message: null });
  });

  it("기록이 없으면 빈 목록이다", async () => {
    listMock.mockResolvedValue(page(0, [], false));
    const { screen, last } = setup();

    await screen.load();

    expect(last()).toMatchObject({ phase: "ready", records: [] });
  });

  it("코드 실수는 안내로 바꾸지 않고 던진다", async () => {
    listMock.mockRejectedValue(new TypeError("코드 실수"));
    const { screen } = setup();

    await expect(screen.load()).rejects.toThrow(TypeError);
  });

  it("화면을 떠나면 요청을 취소하고 더는 알리지 않는다", async () => {
    const pending = deferred<RecordListResult>();
    listMock.mockReturnValue(pending.promise);
    const { screen, views, exits } = setup();

    const loading = screen.load();
    screen.dispose();
    const signal = listMock.mock.calls[0][1];
    pending.reject(new DOMException("취소", "AbortError"));
    await loading;

    expect(signal?.aborted).toBe(true);
    expect(views).toEqual([]);
    expect(exits).toEqual([]);
  });
});

describe("H01 더 보기", () => {
  async function loadedFirstPage(hasNext = true) {
    listMock.mockResolvedValueOnce(page(0, range(21, 40).reverse(), hasNext));
    const harness = setup();
    await harness.screen.load();
    return harness;
  }

  it("다음 페이지를 뒤에 붙인다", async () => {
    const { screen, last } = await loadedFirstPage();
    listMock.mockResolvedValueOnce(page(1, range(1, 5).reverse(), false));

    await screen.loadMore();

    expect(listMock).toHaveBeenLastCalledWith(
      { page: 1, size: 20 },
      expect.any(AbortSignal),
    );
    expect(last().records).toHaveLength(25);
    expect(last().records.at(-1)?.medicalRecordId).toBe(1);
    expect(last().hasNext).toBe(false);
  });

  it("다음 페이지가 없으면 요청하지 않는다", async () => {
    const { screen } = await loadedFirstPage(false);

    await screen.loadMore();

    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("불러오는 중에 다시 눌러도 요청은 한 번이다", async () => {
    const { screen, last } = await loadedFirstPage();
    const pending = deferred<RecordListResult>();
    listMock.mockReturnValueOnce(pending.promise);

    const first = screen.loadMore();
    const second = screen.loadMore();
    expect(last().loadingMore).toBe(true);
    pending.resolve(page(1, [1], false));
    await Promise.all([first, second]);

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(last().loadingMore).toBe(false);
  });

  it("실패하면 이미 불러온 목록은 두고 안내만 보여 주며 다시 시도할 수 있다", async () => {
    const { screen, last } = await loadedFirstPage();
    listMock.mockRejectedValueOnce(apiError("SUMMARY_500"));

    await screen.loadMore();
    expect(last()).toMatchObject({
      phase: "ready",
      moreMessage: SERVER_ERROR_MESSAGE,
      loadingMore: false,
    });
    expect(last().records).toHaveLength(20);

    listMock.mockResolvedValueOnce(page(1, [1], false));
    await screen.loadMore();
    expect(last().moreMessage).toBeNull();
    expect(last().records).toHaveLength(21);
  });

  it("더 보기 중 AUTH_401이면 로그인으로 보낸다", async () => {
    const { screen, exits } = await loadedFirstPage();
    listMock.mockRejectedValueOnce(apiError("AUTH_401"));

    await screen.loadMore();

    expect(exits).toEqual(["login"]);
  });
});

describe("H01 지우기", () => {
  async function loadedList(ids: number[], hasNext = false) {
    listMock.mockResolvedValueOnce(page(0, ids, hasNext));
    const harness = setup();
    await harness.screen.load();
    return harness;
  }

  it("서버가 지웠다고 한 뒤에 목록에서 뺀다", async () => {
    const { screen, last } = await loadedList([3, 2, 1]);
    const pending = deferred<{ medicalRecordId: number }>();
    deleteMock.mockReturnValue(pending.promise);

    const removing = screen.remove(2);
    expect(last().deletingId).toBe(2);
    expect(last().records).toHaveLength(3);
    pending.resolve({ medicalRecordId: 2 });

    await expect(removing).resolves.toBe(true);
    expect(last().records.map((record) => record.medicalRecordId)).toEqual([
      3, 1,
    ]);
    expect(last().deletingId).toBeNull();
  });

  it("지우는 중에는 다른 기록도 지울 수 없다", async () => {
    const { screen } = await loadedList([3, 2, 1]);
    const pending = deferred<{ medicalRecordId: number }>();
    deleteMock.mockReturnValue(pending.promise);

    const first = screen.remove(2);
    await expect(screen.remove(3)).resolves.toBe(false);
    pending.resolve({ medicalRecordId: 2 });
    await first;

    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("이미 지워진 기록(SUMMARY_404)은 목록에서만 뺀다", async () => {
    const { screen, last } = await loadedList([3, 2]);
    deleteMock.mockRejectedValue(apiError("SUMMARY_404"));

    await expect(screen.remove(3)).resolves.toBe(true);

    expect(last().records.map((record) => record.medicalRecordId)).toEqual([2]);
    expect(last().deleteMessage).toBeNull();
  });

  it("지우기가 실패하면 기록을 그대로 두고 안내한다", async () => {
    const { screen, last } = await loadedList([3, 2]);
    deleteMock.mockRejectedValue(apiError("SUMMARY_500"));

    await expect(screen.remove(3)).resolves.toBe(false);

    expect(last().records).toHaveLength(2);
    expect(last()).toMatchObject({
      deletingId: null,
      deleteMessage: SERVER_ERROR_MESSAGE,
    });
  });

  it("다른 회원의 기록(SUMMARY_403)은 목록에서 빼지 않고 안내한다", async () => {
    const { screen, last } = await loadedList([3]);
    deleteMock.mockRejectedValue(apiError("SUMMARY_403"));

    await expect(screen.remove(3)).resolves.toBe(false);

    expect(last().records).toHaveLength(1);
    expect(last().deleteMessage).toBe("서버 안내 문장");
  });

  it("지우기 중 AUTH_401이면 로그인으로 보낸다", async () => {
    const { screen, exits } = await loadedList([3]);
    deleteMock.mockRejectedValue(apiError("AUTH_401"));

    await expect(screen.remove(3)).resolves.toBe(false);

    expect(exits).toEqual(["login"]);
  });

  it("마지막 기록을 지워도 다음 페이지가 있으면 빈 화면 대신 더 보기를 남긴다", async () => {
    const { screen, last } = await loadedList([3], true);
    deleteMock.mockResolvedValue({ medicalRecordId: 3 });

    await screen.remove(3);

    expect(last()).toMatchObject({ records: [], hasNext: true });
  });

  it("한 건 지운 뒤 더 보기는 앞으로 당겨진 기록을 빠뜨리지 않는다", async () => {
    // 1쪽(20건)을 받은 뒤 한 건을 지우면 서버의 21번째 기록이 20번째로 당겨진다.
    const { screen, last } = await loadedList(range(21, 40).reverse(), true);
    deleteMock.mockResolvedValue({ medicalRecordId: 40 });
    await screen.remove(40);
    expect(last().records).toHaveLength(19);

    // 서버는 지운 뒤 기준으로 0쪽에 39..20(19건)과 당겨진 20번째 기록을 준다.
    listMock.mockResolvedValueOnce(page(0, range(20, 39).reverse(), true));
    await screen.loadMore();

    expect(listMock).toHaveBeenLastCalledWith(
      { page: 0, size: 20 },
      expect.any(AbortSignal),
    );
    const ids = last().records.map((record) => record.medicalRecordId);
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
    expect(ids).toContain(20);
  });
});
