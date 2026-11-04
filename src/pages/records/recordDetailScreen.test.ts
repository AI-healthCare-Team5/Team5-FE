import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, SERVER_ERROR_MESSAGE } from "@/api/errors";
import { deleteRecord, getRecord, type RecordDetail } from "@/api/records";
import {
  createRecordDetailScreen,
  parseRecordId,
  type RecordDetailExit,
  type RecordDetailView,
} from "@/pages/records/recordDetailScreen";
import { appActions } from "@/stores/appStore";
import { sampleSummary } from "@/stores/fixtures";
import { loadMember } from "@/stores/memberSession";

vi.mock("@/api/records", () => ({
  getRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));
vi.mock("@/stores/memberSession", () => ({ loadMember: vi.fn() }));

// 실제 백엔드가 아니라 API 함수를 가짜로 바꿔 화면 동작을 확인합니다. 모든 값은 가짜 데이터입니다.
const getMock = vi.mocked(getRecord);
const deleteMock = vi.mocked(deleteRecord);
const memberMock = vi.mocked(loadMember);

const detail: RecordDetail = {
  medicalRecordId: 12,
  createdAt: "2026-10-16T14:25:00+09:00",
  summary: { ...sampleSummary, medications: null, conditions: [] },
};

function apiError(code: string) {
  return new ApiError(code, "서버 안내 문장", Number(code.slice(-3)));
}

function setup(id: string | undefined = "12") {
  const views: RecordDetailView[] = [];
  const exits: RecordDetailExit[] = [];
  const screen = createRecordDetailScreen(id, {
    onView: (view) => views.push(view),
    onExit: (to) => exits.push(to),
  });
  return { views, exits, screen, last: () => views[views.length - 1] };
}

beforeEach(() => {
  getMock.mockReset();
  deleteMock.mockReset();
  memberMock.mockReset();
  appActions.logout();
  appActions.completeLogin(
    { nickname: "봄날", needsRecordConsent: false },
    { returnTo: "/records", saveTarget: null },
  );
});

describe("기록 ID 읽기", () => {
  it.each([
    ["12", 12],
    ["1", 1],
  ])("%s는 %i다", (value, expected) => {
    expect(parseRecordId(value)).toBe(expected);
  });

  it.each([undefined, "", "0", "-1", "1.5", "abc", "1e3", "012", " 1"])(
    "%j는 기록 ID가 아니다",
    (value) => {
      expect(parseRecordId(value)).toBeNull();
    },
  );

  it("안전한 정수 범위를 넘으면 기록 ID가 아니다", () => {
    expect(parseRecordId("99999999999999999999")).toBeNull();
  });
});

describe("H02 불러오기", () => {
  it("S06과 같은 summary를 null·[] 그대로 받아 보여 준다", async () => {
    getMock.mockResolvedValue(detail);
    const { screen, last } = setup();

    await screen.load();

    expect(getMock).toHaveBeenCalledWith(12, expect.any(AbortSignal));
    expect(last().phase).toBe("ready");
    expect(last().record?.summary.medications).toBeNull();
    expect(last().record?.summary.conditions).toEqual([]);
  });

  it("주소의 ID가 잘못되면 요청하지 않고 찾을 수 없다고 한다", async () => {
    const { screen, last } = setup("abc");

    await screen.load();

    expect(getMock).not.toHaveBeenCalled();
    expect(last().phase).toBe("notFound");
  });

  it.each(["SUMMARY_403", "SUMMARY_404"])(
    "%s는 찾을 수 없다고 안내한다",
    async (code) => {
      getMock.mockRejectedValue(apiError(code));
      const { screen, last } = setup();

      await screen.load();

      expect(last()).toMatchObject({ phase: "notFound", record: null });
    },
  );

  it("새로고침해서 로그인 상태가 없으면 서버에 확인하고, 로그인하지 않았으면 로그인으로 보낸다", async () => {
    appActions.logout();
    memberMock.mockResolvedValue("loggedOut");
    const { screen, exits } = setup();

    await screen.load();

    expect(getMock).not.toHaveBeenCalled();
    expect(exits).toEqual(["login"]);
  });

  it("새로고침 뒤 로그인이 남아 있으면 기록을 받는다", async () => {
    appActions.logout();
    memberMock.mockResolvedValue("loggedIn");
    getMock.mockResolvedValue(detail);
    const { screen, last } = setup();

    await screen.load();

    expect(last().phase).toBe("ready");
  });

  it("AUTH_401이면 로그인으로 보낸다", async () => {
    getMock.mockRejectedValue(apiError("AUTH_401"));
    const { screen, exits } = setup();

    await screen.load();

    expect(exits).toEqual(["login"]);
  });

  it("서버 오류는 공통 안내를 보여 주고 다시 시도하면 불러온다", async () => {
    getMock.mockRejectedValueOnce(apiError("SUMMARY_500"));
    const { screen, last } = setup();

    await screen.load();
    expect(last()).toMatchObject({
      phase: "error",
      message: SERVER_ERROR_MESSAGE,
    });

    getMock.mockResolvedValueOnce(detail);
    await screen.load();
    expect(last().phase).toBe("ready");
  });
});

describe("H02 지우기", () => {
  async function loaded() {
    getMock.mockResolvedValue(detail);
    const harness = setup();
    await harness.screen.load();
    return harness;
  }

  it("지우면 내 기록으로 돌아간다", async () => {
    const { screen, exits } = await loaded();
    deleteMock.mockResolvedValue({ medicalRecordId: 12 });

    await screen.remove();

    expect(deleteMock).toHaveBeenCalledWith(12, expect.any(AbortSignal));
    expect(exits).toEqual(["records"]);
  });

  it("이미 지워진 기록(SUMMARY_404)도 내 기록으로 돌아간다", async () => {
    const { screen, exits } = await loaded();
    deleteMock.mockRejectedValue(apiError("SUMMARY_404"));

    await screen.remove();

    expect(exits).toEqual(["records"]);
  });

  it("실패하면 상세를 그대로 두고 안내하며 다시 지울 수 있다", async () => {
    const { screen, last, exits } = await loaded();
    deleteMock.mockRejectedValueOnce(apiError("SUMMARY_500"));

    await screen.remove();
    expect(last()).toMatchObject({
      phase: "ready",
      deleting: false,
      deleteMessage: SERVER_ERROR_MESSAGE,
    });
    expect(exits).toEqual([]);

    deleteMock.mockResolvedValueOnce({ medicalRecordId: 12 });
    await screen.remove();
    expect(exits).toEqual(["records"]);
  });

  it("지우는 중에 다시 눌러도 요청은 한 번이다", async () => {
    const { screen } = await loaded();
    let resolve: (value: { medicalRecordId: number }) => void = () => {};
    deleteMock.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );

    const first = screen.remove();
    const second = screen.remove();
    resolve({ medicalRecordId: 12 });
    await Promise.all([first, second]);

    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("불러오기 전에는 지울 수 없다", async () => {
    const { screen } = setup();

    await screen.remove();

    expect(deleteMock).not.toHaveBeenCalled();
  });
});
