import { getErrorMessage, isApiError } from "@/api/errors";
import {
  loadMember,
  logoutMember,
  withdrawAccount,
} from "@/stores/memberSession";

// P01(내 정보)의 계정 영역 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 로그인 상태, 동의, 기록 수는 불러온 내 정보가 store에 담기므로 화면은 store에서 읽습니다.

export const SIGNED_OUT_MESSAGE = "로그인이 풀렸어요. 다시 로그인해 주세요.";

export interface MyInfoView {
  // loading: 내 정보를 불러오는 중, ready: 계정 영역을 보여 주는 중, error: 불러오지 못함
  phase: "loading" | "ready" | "error";
  // phase가 error일 때의 안내입니다.
  message: string | null;
  // 로그아웃·탈퇴 요청이 진행 중이면 어떤 요청인지 알려 줍니다. 버튼을 잠가 이중 전송을 막습니다.
  busy: "logout" | "withdraw" | null;
  // 로그아웃·탈퇴가 실패했을 때의 안내입니다.
  actionMessage: string | null;
}

export const initialMyInfoView: MyInfoView = {
  phase: "loading",
  message: null,
  busy: null,
  actionMessage: null,
};

// start: 로그아웃하거나 탈퇴해서 처음(S01)으로 갑니다.
export type MyInfoExit = "start";

export interface MyInfoScreenHooks {
  onView: (view: MyInfoView) => void;
  onExit: (to: MyInfoExit) => void;
}

export interface MyInfoScreen {
  // 내 정보를 불러옵니다. 로그인하지 않았으면 오류 없이 ready가 되고, 화면은 store의 loggedIn으로 로그인 안내를 보여 줍니다.
  load: () => Promise<void>;
  // 로그아웃합니다. 요청이 실패하면 로그인 상태를 그대로 두고 안내합니다.
  logout: () => Promise<void>;
  // 탈퇴합니다. 서버가 기록·보호자를 지우고 동의를 모두 철회합니다.
  withdraw: () => Promise<void>;
  // 화면을 떠날 때 부릅니다. 진행 중인 요청을 취소하고 더는 view나 이동을 알리지 않습니다.
  dispose: () => void;
}

export function createMyInfoScreen(hooks: MyInfoScreenHooks): MyInfoScreen {
  let view = initialMyInfoView;
  let disposed = false;
  let exited = false;
  // 화면을 떠나면 진행 중인 요청을 모두 취소합니다.
  const requests = new AbortController();

  function update(patch: Partial<MyInfoView>) {
    if (disposed) return;
    view = { ...view, ...patch };
    hooks.onView(view);
  }

  function exit(to: MyInfoExit) {
    if (disposed || exited) return;
    exited = true;
    hooks.onExit(to);
  }

  // 요청이 실패했을 때입니다. 코드 실수는 서버 오류 안내로 바꾸지 않고, release로 화면만 풀어 준 뒤 그대로 던집니다.
  function handleFailure(
    error: unknown,
    release: () => void,
    show: (message: string) => void,
  ) {
    if (requests.signal.aborted) return;
    if (!isApiError(error)) {
      release();
      throw error;
    }
    show(getErrorMessage(error));
  }

  async function load() {
    if (view.phase !== "loading") update({ ...initialMyInfoView });
    try {
      await loadMember(requests.signal);
      update({ phase: "ready" });
    } catch (error) {
      handleFailure(
        error,
        () => update({ phase: "error", message: null }),
        (message) => update({ phase: "error", message }),
      );
    }
  }

  async function logout() {
    if (view.phase !== "ready" || view.busy) return;
    update({ busy: "logout", actionMessage: null });
    try {
      // 화면을 떠나도 서버에는 로그아웃이 전달되어야 하므로 취소하지 않습니다.
      await logoutMember();
      exit("start");
    } catch (error) {
      handleFailure(
        error,
        () => update({ busy: null }),
        (message) => update({ busy: null, actionMessage: message }),
      );
    }
  }

  async function withdraw() {
    if (view.phase !== "ready" || view.busy) return;
    update({ busy: "withdraw", actionMessage: null });
    try {
      // 화면을 떠나도 탈퇴 요청은 취소하지 않습니다. 서버가 처리했는데 store만 남는 일을 막습니다.
      const result = await withdrawAccount();
      if (result === "loggedOut") {
        update({ busy: null, actionMessage: SIGNED_OUT_MESSAGE });
        return;
      }
      exit("start");
    } catch (error) {
      handleFailure(
        error,
        () => update({ busy: null }),
        (message) => update({ busy: null, actionMessage: message }),
      );
    }
  }

  function dispose() {
    disposed = true;
    requests.abort();
  }

  return { load, logout, withdraw, dispose };
}
