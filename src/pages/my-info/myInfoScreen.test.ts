import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, SERVER_ERROR_MESSAGE } from "@/api/errors";
import {
  createMyInfoScreen,
  SIGNED_OUT_MESSAGE,
  type MyInfoExit,
  type MyInfoView,
} from "@/pages/my-info/myInfoScreen";
import {
  loadMember,
  logoutMember,
  withdrawAccount,
} from "@/stores/memberSession";

vi.mock("@/stores/memberSession", () => ({
  loadMember: vi.fn(),
  logoutMember: vi.fn(),
  withdrawAccount: vi.fn(),
}));

// 실제 백엔드가 아니라 회원 동작을 가짜로 바꿔 화면 동작을 확인합니다.
const loadMock = vi.mocked(loadMember);
const logoutMock = vi.mocked(logoutMember);
const withdrawMock = vi.mocked(withdrawAccount);

function setup() {
  const views: MyInfoView[] = [];
  const exits: MyInfoExit[] = [];
  const screen = createMyInfoScreen({
    onView: (view) => views.push(view),
    onExit: (to) => exits.push(to),
  });
  return { views, exits, screen, last: () => views[views.length - 1] };
}

async function loaded() {
  loadMock.mockResolvedValue("loggedIn");
  const harness = setup();
  await harness.screen.load();
  return harness;
}

beforeEach(() => {
  loadMock.mockReset();
  logoutMock.mockReset();
  withdrawMock.mockReset();
});

describe("P01 계정 영역", () => {
  it("내 정보를 불러오면 계정 영역을 보여 준다", async () => {
    const { last } = await loaded();

    expect(last().phase).toBe("ready");
  });

  it("로그인하지 않았어도 오류 없이 계정 영역(로그인 안내)을 보여 준다", async () => {
    loadMock.mockResolvedValue("loggedOut");
    const { screen, last } = setup();

    await screen.load();

    expect(last()).toMatchObject({ phase: "ready", message: null });
  });

  it("불러오기에 실패하면 안내하고 다시 시도할 수 있다", async () => {
    loadMock.mockRejectedValueOnce(new ApiError("MEMBER_500", "내부", 500));
    const { screen, last } = setup();

    await screen.load();
    expect(last()).toMatchObject({
      phase: "error",
      message: SERVER_ERROR_MESSAGE,
    });

    loadMock.mockResolvedValueOnce("loggedIn");
    await screen.load();
    expect(last().phase).toBe("ready");
  });

  it("로그아웃하면 처음으로 간다", async () => {
    const { screen, exits } = await loaded();
    logoutMock.mockResolvedValue(undefined);

    await screen.logout();

    expect(exits).toEqual(["start"]);
  });

  it("로그아웃이 실패하면 처음으로 가지 않고 안내하며 다시 시도할 수 있다", async () => {
    const { screen, last, exits } = await loaded();
    logoutMock.mockRejectedValueOnce(new ApiError("NETWORK_ERROR", "", 0));

    await screen.logout();
    expect(last()).toMatchObject({
      busy: null,
      actionMessage: SERVER_ERROR_MESSAGE,
    });
    expect(exits).toEqual([]);

    logoutMock.mockResolvedValueOnce(undefined);
    await screen.logout();
    expect(exits).toEqual(["start"]);
  });

  it("탈퇴하면 처음으로 간다", async () => {
    const { screen, exits } = await loaded();
    withdrawMock.mockResolvedValue("withdrawn");

    await screen.withdraw();

    expect(exits).toEqual(["start"]);
  });

  it("탈퇴 중 로그인이 풀렸으면 처음으로 가지 않고 다시 로그인하라고 안내한다", async () => {
    const { screen, last, exits } = await loaded();
    withdrawMock.mockResolvedValue("loggedOut");

    await screen.withdraw();

    expect(exits).toEqual([]);
    expect(last()).toMatchObject({
      busy: null,
      actionMessage: SIGNED_OUT_MESSAGE,
    });
  });

  it("탈퇴가 실패하면 안내한다", async () => {
    const { screen, last } = await loaded();
    withdrawMock.mockRejectedValue(new ApiError("MEMBER_500", "내부", 500));

    await screen.withdraw();

    expect(last().actionMessage).toBe(SERVER_ERROR_MESSAGE);
  });

  it("요청 중에는 로그아웃·탈퇴를 다시 보내지 않는다", async () => {
    const { screen } = await loaded();
    let resolve: () => void = () => {};
    logoutMock.mockReturnValue(
      new Promise<void>((res) => {
        resolve = res;
      }),
    );

    const first = screen.logout();
    await screen.logout();
    await screen.withdraw();
    resolve();
    await first;

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(withdrawMock).not.toHaveBeenCalled();
  });

  it("불러오기 전에는 로그아웃·탈퇴할 수 없다", async () => {
    const { screen } = setup();

    await screen.logout();
    await screen.withdraw();

    expect(logoutMock).not.toHaveBeenCalled();
    expect(withdrawMock).not.toHaveBeenCalled();
  });

  it("화면을 떠난 뒤 끝난 로그아웃은 이동을 알리지 않는다", async () => {
    const { screen, exits } = await loaded();
    let resolve: () => void = () => {};
    logoutMock.mockReturnValue(
      new Promise<void>((res) => {
        resolve = res;
      }),
    );

    const pending = screen.logout();
    screen.dispose();
    resolve();
    await pending;

    expect(exits).toEqual([]);
  });
});
