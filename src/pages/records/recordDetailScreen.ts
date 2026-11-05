import { getErrorMessage, isApiError, isUnauthenticated } from "@/api/errors";
import { deleteRecord, getRecord, type RecordDetail } from "@/api/records";
import { appActions, getAppState } from "@/stores/appStore";
import { loadMember } from "@/stores/memberSession";

// H02(기록 상세)의 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 요약지는 S06과 같은 모양이라 화면이 요약지 컴포넌트(SummaryDocument)에 그대로 넘깁니다.

export interface RecordDetailView {
  // loading: 불러오는 중, ready: 기록을 보여 주는 중,
  // notFound: 없거나 지웠거나 내 기록이 아님, error: 불러오지 못함
  phase: "loading" | "ready" | "notFound" | "error";
  // phase가 ready일 때만 있습니다.
  record: RecordDetail | null;
  // phase가 error일 때의 안내입니다.
  message: string | null;
  // 지우는 요청이 진행 중입니다. 이중 전송을 막습니다.
  deleting: boolean;
  // 지우지 못했을 때의 안내입니다.
  deleteMessage: string | null;
}

export const initialRecordDetailView: RecordDetailView = {
  phase: "loading",
  record: null,
  message: null,
  deleting: false,
  deleteMessage: null,
};

// login: 로그인하지 않았거나 로그인이 풀려서 로그인(L01)으로 갑니다.
// records: 기록을 지워서 내 기록(H01)으로 돌아갑니다.
export type RecordDetailExit = "login" | "records";

export interface RecordDetailHooks {
  onView: (view: RecordDetailView) => void;
  onExit: (to: RecordDetailExit) => void;
}

export interface RecordDetailScreen {
  // 로그인 상태를 확인하고 기록을 불러옵니다. 실패해서 보이는 "다시 시도"도 이 함수입니다.
  load: () => Promise<void>;
  // 기록을 지우고 내 기록으로 돌아갑니다.
  remove: () => Promise<void>;
  // 화면을 떠날 때 부릅니다. 진행 중인 요청을 취소하고 더는 view나 이동을 알리지 않습니다.
  dispose: () => void;
}

// 주소의 :id를 기록 ID로 바꿉니다. 양의 정수가 아니면 null입니다.
export function parseRecordId(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function createRecordDetailScreen(
  idParam: string | undefined,
  hooks: RecordDetailHooks,
): RecordDetailScreen {
  const medicalRecordId = parseRecordId(idParam);
  let view = initialRecordDetailView;
  let disposed = false;
  let exited = false;
  // 화면을 떠나면 진행 중인 요청을 모두 취소합니다.
  const requests = new AbortController();

  function update(patch: Partial<RecordDetailView>) {
    if (disposed) return;
    view = { ...view, ...patch };
    hooks.onView(view);
  }

  function exit(to: RecordDetailExit) {
    if (disposed || exited) return;
    exited = true;
    hooks.onExit(to);
  }

  function leaveToLogin() {
    appActions.markLoggedOut();
    exit("login");
  }

  // 요청이 실패했을 때입니다. 코드 실수는 서버 오류 안내로 바꾸지 않고, release로 화면만 풀어 준 뒤 그대로 던집니다.
  function handleFailure(
    error: unknown,
    release: () => void,
    show: (error: unknown) => void,
  ) {
    if (requests.signal.aborted) return;
    if (!isApiError(error)) {
      release();
      throw error;
    }
    if (isUnauthenticated(error)) {
      leaveToLogin();
      return;
    }
    show(error);
  }

  // 다른 회원의 기록(SUMMARY_403)과 없거나 지운 기록(SUMMARY_404)은 같은 안내를 보여 줍니다.
  function isMissingRecord(error: unknown): boolean {
    return (
      isApiError(error) &&
      (error.code === "SUMMARY_403" || error.code === "SUMMARY_404")
    );
  }

  async function load() {
    if (medicalRecordId === null) {
      update({ phase: "notFound" });
      return;
    }
    if (view.phase !== "loading") {
      update({ ...initialRecordDetailView });
    }
    try {
      // 새로고침하면 store의 로그인 상태가 사라지므로 서버에 확인합니다.
      if (!getAppState().loggedIn) {
        const member = await loadMember(requests.signal);
        if (member === "loggedOut") {
          leaveToLogin();
          return;
        }
      }
      const record = await getRecord(medicalRecordId, requests.signal);
      update({ phase: "ready", record });
    } catch (error) {
      handleFailure(
        error,
        () => update({ phase: "error", message: null }),
        (failure) =>
          isMissingRecord(failure)
            ? update({ phase: "notFound" })
            : update({ phase: "error", message: getErrorMessage(failure) }),
      );
    }
  }

  async function remove() {
    if (medicalRecordId === null || view.phase !== "ready" || view.deleting) {
      return;
    }
    update({ deleting: true, deleteMessage: null });
    try {
      await deleteRecord(medicalRecordId, requests.signal);
      exit("records");
    } catch (error) {
      handleFailure(
        error,
        () => update({ deleting: false }),
        (failure) => {
          // 이미 지워진 기록(SUMMARY_404)은 원하는 상태이므로 목록으로 돌아갑니다.
          if (isApiError(failure) && failure.code === "SUMMARY_404") {
            exit("records");
            return;
          }
          update({ deleting: false, deleteMessage: getErrorMessage(failure) });
        },
      );
    }
  }

  function dispose() {
    disposed = true;
    requests.abort();
  }

  return { load, remove, dispose };
}
