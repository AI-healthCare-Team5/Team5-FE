import { getErrorMessage, isApiError } from "@/api/errors";
import {
  loadMember,
  logoutMember,
  removeGuardianContact,
  withdrawAccount,
} from "@/stores/memberSession";

// P01(내 정보)의 계정 영역과 보호자 연락처 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 로그인 상태, 동의, 기록 수, 보호자는 불러온 내 정보가 store에 담기므로 화면은 store에서 읽습니다.

export const SIGNED_OUT_MESSAGE = "로그인이 풀렸어요. 다시 로그인해 주세요.";

export interface MyInfoView {
  // loading: 내 정보를 불러오는 중, ready: 계정 영역을 보여 주는 중, error: 불러오지 못함
  phase: "loading" | "ready" | "error";
  // phase가 error일 때의 안내입니다.
  message: string | null;
  // 로그아웃·탈퇴·보호자 지우기 요청이 진행 중이면 어떤 요청인지 알려 줍니다. 버튼을 잠가 이중 전송을 막습니다.
  busy: "logout" | "withdraw" | "removeGuardian" | null;
  // 로그아웃·탈퇴가 실패했거나 요청 중 로그인이 풀렸을 때의 안내입니다.
  actionMessage: string | null;
  // 보호자 연락처 지우기가 실패했을 때의 안내입니다. 누른 버튼이 있는 보호자 카드에 보여 줍니다.
  guardianMessage: string | null;
}

export const initialMyInfoView: MyInfoView = {
  phase: "loading",
  message: null,
  busy: null,
  actionMessage: null,
  guardianMessage: null,
};

// start: 로그아웃하거나 탈퇴해서 처음(S01)으로 갑니다.
export type MyInfoExit = "start";

export interface MyInfoScreenHooks {
  onView: (view: MyInfoView) => void;
  onExit: (to: MyInfoExit) => void;
}

export interface MyInfoScreen {
  // 내 정보를 불러옵니다. 로그인하지 않았으면 오류 없이 ready가 되고, 화면은 store의 loggedIn으로 로그인 안내를 보여 줍니다.
  // 로그아웃·탈퇴 요청이 진행 중이면 다시 불러오지 않습니다.
  load: () => Promise<void>;
  // 로그아웃합니다. 내 정보를 불러오지 못했거나 아직 불러오는 중이어도 할 수 있습니다(POST /auth/logout 하나만 보냅니다).
  // 불러오는 중이던 요청은 취소해서 늦게 도착한 응답이 로그아웃한 상태를 다시 로그인으로 바꾸지 않게 합니다.
  // 요청이 실패하면 로그인 상태를 그대로 두고 안내합니다.
  logout: () => Promise<void>;
  // 탈퇴합니다. 내 정보를 불러온 뒤에만 할 수 있습니다. 서버가 기록·보호자를 지우고 동의를 모두 철회합니다.
  withdraw: () => Promise<void>;
  // 보호자 연락처를 지웁니다. 내 정보를 불러온 뒤에만 할 수 있고, 서버가 보호자 저장 동의도 함께 철회합니다.
  // 지웠으면 true입니다. 화면은 이 값으로 포커스를 옮깁니다.
  removeGuardian: () => Promise<boolean>;
  // 화면을 떠날 때 부릅니다. 진행 중인 요청을 취소하고 더는 view나 이동을 알리지 않습니다.
  dispose: () => void;
}

export function createMyInfoScreen(hooks: MyInfoScreenHooks): MyInfoScreen {
  let view = initialMyInfoView;
  let disposed = false;
  let exited = false;
  // 내 정보 불러오기 요청입니다. 다시 불러오거나 로그아웃을 시작하거나 화면을 떠나면 취소합니다.
  // 로그아웃·탈퇴 요청은 화면을 떠나도 취소하지 않으므로 이 신호를 쓰지 않습니다.
  let loadRequest: AbortController | null = null;

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
    cancelled: boolean,
    release: () => void,
    show: (message: string) => void,
  ) {
    if (disposed || cancelled) return;
    if (!isApiError(error)) {
      release();
      throw error;
    }
    show(getErrorMessage(error));
  }

  async function load() {
    if (view.busy) return;
    loadRequest?.abort();
    const request = new AbortController();
    loadRequest = request;
    if (view.phase !== "loading") update({ ...initialMyInfoView });
    try {
      await loadMember(request.signal);
      if (request.signal.aborted) return;
      update({ phase: "ready" });
    } catch (error) {
      handleFailure(
        error,
        request.signal.aborted,
        () => update({ phase: "error", message: null }),
        (message) => update({ phase: "error", message }),
      );
    }
  }

  async function logout() {
    if (view.busy) return;
    // 불러오는 중이던 요청을 취소하면 그 화면은 결과를 받지 못하므로, 로그아웃이 실패하면 오류 화면으로 바꿉니다.
    const loadCancelled = view.phase === "loading";
    loadRequest?.abort();
    update({ busy: "logout", actionMessage: null });
    try {
      // 화면을 떠나도 서버에는 로그아웃이 전달되어야 하므로 취소하지 않습니다.
      await logoutMember();
      exit("start");
    } catch (error) {
      handleFailure(
        error,
        false,
        () =>
          update(
            loadCancelled ? { busy: null, phase: "error" } : { busy: null },
          ),
        (message) =>
          update(
            loadCancelled
              ? { busy: null, phase: "error", message }
              : { busy: null, actionMessage: message },
          ),
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
        false,
        () => update({ busy: null }),
        (message) => update({ busy: null, actionMessage: message }),
      );
    }
  }

  async function removeGuardian(): Promise<boolean> {
    if (view.phase !== "ready" || view.busy) return false;
    update({
      busy: "removeGuardian",
      actionMessage: null,
      guardianMessage: null,
    });
    try {
      // 탈퇴처럼 화면을 떠나도 취소하지 않습니다. 서버가 지웠는데 store만 남는 일을 막습니다.
      const outcome = await removeGuardianContact();
      if (outcome.kind === "removed") {
        update({ busy: null });
        return true;
      }
      if (outcome.kind === "needsLogin") {
        update({ busy: null, actionMessage: SIGNED_OUT_MESSAGE });
        return false;
      }
      update({
        busy: null,
        guardianMessage: outcome.kind === "saved" ? null : outcome.message,
      });
      return false;
    } catch (error) {
      handleFailure(
        error,
        false,
        () => update({ busy: null }),
        (message) => update({ busy: null, guardianMessage: message }),
      );
      return false;
    }
  }

  function dispose() {
    disposed = true;
    loadRequest?.abort();
  }

  return { load, logout, withdraw, removeGuardian, dispose };
}
