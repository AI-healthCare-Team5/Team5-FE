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
  removeGuardianContact,
  withdrawAccount,
} from "@/stores/memberSession";

vi.mock("@/stores/memberSession", () => ({
  loadMember: vi.fn(),
  logoutMember: vi.fn(),
  removeGuardianContact: vi.fn(),
  withdrawAccount: vi.fn(),
}));

// 실제 백엔드가 아니라 회원 동작을 가짜로 바꿔 화면 동작을 확인합니다.
const loadMock = vi.mocked(loadMember);
const logoutMock = vi.mocked(logoutMember);
const withdrawMock = vi.mocked(withdrawAccount);
const removeGuardianMock = vi.mocked(removeGuardianContact);

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
  removeGuardianMock.mockReset();
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

  it("불러오기 전에는 탈퇴할 수 없다", async () => {
    const { screen } = setup();

    await screen.withdraw();

    expect(withdrawMock).not.toHaveBeenCalled();
  });

  describe("내 정보를 불러오지 못했을 때의 로그아웃", () => {
    async function loadFailed() {
      loadMock.mockRejectedValue(new ApiError("COMMON_501", "준비 중", 501));
      const harness = setup();
      await harness.screen.load();
      expect(harness.last().phase).toBe("error");
      return harness;
    }

    it("오류 화면에서도 로그아웃하면 서버에 요청하고 처음으로 간다", async () => {
      const { screen, exits } = await loadFailed();
      logoutMock.mockResolvedValue(undefined);

      await screen.logout();

      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(exits).toEqual(["start"]);
    });

    it("내 정보를 다시 불러오지 않고 로그아웃 요청 하나만 보낸다", async () => {
      const { screen } = await loadFailed();
      logoutMock.mockResolvedValue(undefined);
      loadMock.mockClear();

      await screen.logout();

      expect(loadMock).not.toHaveBeenCalled();
    });

    it("로그아웃이 실패하면 오류 화면을 유지하고 안내하며 다시 시도할 수 있다", async () => {
      const { screen, last, exits } = await loadFailed();
      logoutMock.mockRejectedValueOnce(new ApiError("NETWORK_ERROR", "", 0));

      await screen.logout();
      expect(last()).toMatchObject({
        phase: "error",
        busy: null,
        actionMessage: SERVER_ERROR_MESSAGE,
      });
      expect(exits).toEqual([]);

      logoutMock.mockResolvedValueOnce(undefined);
      await screen.logout();
      expect(exits).toEqual(["start"]);
    });

    it("오류 화면에서 누른 로그아웃을 연타해도 요청은 한 번만 보낸다", async () => {
      const { screen, exits } = await loadFailed();
      let resolve: () => void = () => {};
      logoutMock.mockReturnValue(
        new Promise<void>((res) => {
          resolve = res;
        }),
      );

      const first = screen.logout();
      await screen.logout();
      resolve();
      await first;

      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(exits).toEqual(["start"]);
    });

    it("로그아웃 중에는 다시 불러오지 않고 탈퇴도 할 수 없다", async () => {
      const { screen, last } = await loadFailed();
      let resolve: () => void = () => {};
      logoutMock.mockReturnValue(
        new Promise<void>((res) => {
          resolve = res;
        }),
      );
      loadMock.mockClear();

      const pending = screen.logout();
      await screen.load();
      await screen.withdraw();
      expect(last()).toMatchObject({ phase: "error", busy: "logout" });
      resolve();
      await pending;

      expect(loadMock).not.toHaveBeenCalled();
      expect(withdrawMock).not.toHaveBeenCalled();
    });

    it("오류 화면에서는 탈퇴할 수 없다", async () => {
      const { screen } = await loadFailed();

      await screen.withdraw();

      expect(withdrawMock).not.toHaveBeenCalled();
    });
  });

  describe("불러오는 중에 로그아웃하는 경우", () => {
    // signal이 취소되면 거절하는 불러오기입니다. 응답이 도착하는 시점은 테스트가 정합니다.
    function pendingLoad(honorAbort: boolean) {
      let signal: AbortSignal | undefined;
      let settle: (result: "loggedIn" | "loggedOut") => void = () => {};
      loadMock.mockImplementation((requestSignal) => {
        signal = requestSignal;
        return new Promise((resolve, reject) => {
          settle = resolve;
          if (honorAbort) {
            requestSignal?.addEventListener("abort", () =>
              reject(requestSignal.reason),
            );
          }
        });
      });
      return {
        signal: () => signal,
        settle: (result: "loggedIn" | "loggedOut") => settle(result),
      };
    }

    it("로그아웃을 시작하면 불러오기 요청을 취소하고, 성공하면 처음으로 간다", async () => {
      const load = pendingLoad(true);
      const { screen, exits, views } = setup();
      logoutMock.mockResolvedValue(undefined);

      const loading = screen.load();
      expect(views).toEqual([]);
      await screen.logout();
      await loading;

      expect(load.signal()?.aborted).toBe(true);
      expect(exits).toEqual(["start"]);
    });

    it("취소를 무시하고 늦게 도착한 불러오기 응답으로 화면을 바꾸지 않는다", async () => {
      const load = pendingLoad(false);
      const { screen, views, exits } = setup();
      let resolve: () => void = () => {};
      logoutMock.mockReturnValue(
        new Promise<void>((res) => {
          resolve = res;
        }),
      );

      const loading = screen.load();
      const logout = screen.logout();
      load.settle("loggedIn");
      await loading;
      resolve();
      await logout;

      expect(views.some((view) => view.phase === "ready")).toBe(false);
      expect(exits).toEqual(["start"]);
    });

    it("로그아웃이 실패하면 불러오기는 이미 취소되어 있으므로 오류 화면으로 바꿔 다시 시도할 수 있게 한다", async () => {
      pendingLoad(true);
      const { screen, last, exits } = setup();
      logoutMock.mockRejectedValueOnce(new ApiError("NETWORK_ERROR", "", 0));

      const loading = screen.load();
      await screen.logout();
      await loading;

      expect(last()).toMatchObject({
        phase: "error",
        busy: null,
        message: SERVER_ERROR_MESSAGE,
      });
      expect(exits).toEqual([]);

      loadMock.mockResolvedValue("loggedIn");
      await screen.load();
      expect(last().phase).toBe("ready");
    });

    it("다시 불러오면 앞선 불러오기 요청은 취소하고 마지막 응답만 따른다", async () => {
      const signals: AbortSignal[] = [];
      const settles: Array<(result: "loggedIn" | "loggedOut") => void> = [];
      loadMock.mockImplementation((signal) => {
        if (signal) signals.push(signal);
        return new Promise((resolve) => {
          settles.push(resolve);
        });
      });
      const { screen, views, last } = setup();

      const first = screen.load();
      const second = screen.load();
      settles[0]("loggedIn");
      await first;
      expect(views).toEqual([]);
      settles[1]("loggedOut");
      await second;

      expect(signals[0].aborted).toBe(true);
      expect(signals[1].aborted).toBe(false);
      expect(last().phase).toBe("ready");
    });
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

describe("P01 보호자 연락처 지우기", () => {
  it("지우면 true를 돌려주고 요청 표시를 푼다", async () => {
    const { screen, last } = await loaded();
    removeGuardianMock.mockResolvedValue({ kind: "removed" });

    await expect(screen.removeGuardian()).resolves.toBe(true);

    expect(removeGuardianMock).toHaveBeenCalledTimes(1);
    expect(last()).toMatchObject({
      busy: null,
      actionMessage: null,
      guardianMessage: null,
    });
  });

  it("지우는 동안에는 다른 요청을 보내지 않고 버튼을 잠근다", async () => {
    const { screen, views } = await loaded();
    let resolve: () => void = () => {};
    removeGuardianMock.mockReturnValue(
      new Promise((res) => {
        resolve = () => res({ kind: "removed" });
      }),
    );

    const first = screen.removeGuardian();
    expect(views.at(-1)?.busy).toBe("removeGuardian");
    await expect(screen.removeGuardian()).resolves.toBe(false);
    await screen.withdraw();
    resolve();
    await first;

    expect(removeGuardianMock).toHaveBeenCalledTimes(1);
    expect(withdrawMock).not.toHaveBeenCalled();
  });

  it("실패하면 보호자 카드에 안내하고 false를 돌려준다", async () => {
    const { screen, last } = await loaded();
    removeGuardianMock.mockResolvedValue({
      kind: "failed",
      message: SERVER_ERROR_MESSAGE,
    });

    await expect(screen.removeGuardian()).resolves.toBe(false);

    expect(last()).toMatchObject({
      busy: null,
      guardianMessage: SERVER_ERROR_MESSAGE,
      actionMessage: null,
    });
  });

  it("로그인이 풀렸으면 다시 로그인하라고 안내한다", async () => {
    const { screen, last } = await loaded();
    removeGuardianMock.mockResolvedValue({ kind: "needsLogin" });

    await expect(screen.removeGuardian()).resolves.toBe(false);

    expect(last()).toMatchObject({
      busy: null,
      actionMessage: SIGNED_OUT_MESSAGE,
      guardianMessage: null,
    });
  });

  it("코드 실수는 안내로 바꾸지 않고 버튼만 풀어 준 뒤 그대로 던진다", async () => {
    const { screen, last } = await loaded();
    removeGuardianMock.mockRejectedValue(new TypeError("oops"));

    await expect(screen.removeGuardian()).rejects.toThrow(TypeError);

    expect(last()).toMatchObject({ busy: null, guardianMessage: null });
  });

  it("불러오기 전에는 지울 수 없다", async () => {
    const { screen } = setup();

    await expect(screen.removeGuardian()).resolves.toBe(false);

    expect(removeGuardianMock).not.toHaveBeenCalled();
  });
});
