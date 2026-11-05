import { getErrorMessage, isApiError, isUnauthenticated } from "@/api/errors";
import {
  deleteRecord,
  listRecords,
  RECORDS_PAGE_SIZE,
  type RecordListItem,
} from "@/api/records";
import { appActions, getAppState } from "@/stores/appStore";
import { loadMember } from "@/stores/memberSession";

// H01(내 기록)의 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 화면은 onView로 받은 view를 그리고, onExit로 로그인(L01)으로 보내라는 알림을 받습니다.

export interface RecordsView {
  // loading: 첫 페이지를 불러오는 중, ready: 목록을 보여 주는 중, error: 첫 페이지를 불러오지 못함
  phase: "loading" | "ready" | "error";
  // 불러온 기록입니다. 최근 순이고 서버가 만든 subtitle을 그대로 보여 줍니다.
  records: RecordListItem[];
  hasNext: boolean;
  // phase가 error일 때의 안내입니다.
  message: string | null;
  loadingMore: boolean;
  // 다음 페이지를 불러오지 못했을 때의 안내입니다. 이미 불러온 목록은 그대로 둡니다.
  moreMessage: string | null;
  // 지우는 요청이 진행 중인 기록 ID입니다. 이중 전송을 막습니다.
  deletingId: number | null;
  // 지우지 못했을 때의 안내입니다.
  deleteMessage: string | null;
}

export const initialRecordsView: RecordsView = {
  phase: "loading",
  records: [],
  hasNext: false,
  message: null,
  loadingMore: false,
  moreMessage: null,
  deletingId: null,
  deleteMessage: null,
};

// login: 로그인하지 않았거나 로그인이 풀려서 로그인(L01)으로 갑니다.
export type RecordsExit = "login";

export interface RecordsScreenHooks {
  onView: (view: RecordsView) => void;
  onExit: (to: RecordsExit) => void;
}

export interface RecordsScreen {
  // 로그인 상태를 확인하고 첫 페이지를 불러옵니다. 실패해서 보이는 "다시 시도"도 이 함수입니다.
  load: () => Promise<void>;
  // 다음 페이지를 불러와 목록 뒤에 붙입니다.
  loadMore: () => Promise<void>;
  // 기록을 지웁니다. 지웠으면(이미 지워진 기록 포함) true입니다.
  remove: (medicalRecordId: number) => Promise<boolean>;
  // 화면을 떠날 때 부릅니다. 진행 중인 요청을 취소하고 더는 view나 이동을 알리지 않습니다.
  dispose: () => void;
}

// 새로 불러온 기록을 뒤에 붙입니다. 이미 있는 기록은 건너뜁니다.
// 기록을 지우거나 다른 기기에서 새로 보관하면 페이지 경계가 밀려 같은 기록이 다시 올 수 있습니다.
export function mergeRecords(
  current: RecordListItem[],
  incoming: RecordListItem[],
): RecordListItem[] {
  const seen = new Set(current.map((record) => record.medicalRecordId));
  const added = incoming.filter((record) => !seen.has(record.medicalRecordId));
  return [...current, ...added];
}

// 불러온 기록 수로 다음에 요청할 페이지를 정합니다.
// 지운 만큼 뒤 기록이 앞으로 당겨져 있으므로 "불러온 페이지 수 + 1"이 아니라 이미 가진 기록의 끝이 속한 페이지부터 받고,
// 겹치는 기록은 mergeRecords가 건너뛰어서 빠지는 기록이 없습니다.
export function nextPageOf(loadedCount: number, size: number): number {
  return Math.floor(loadedCount / size);
}

export function createRecordsScreen(hooks: RecordsScreenHooks): RecordsScreen {
  let view = initialRecordsView;
  let disposed = false;
  let exited = false;
  // 화면을 떠나면 진행 중인 요청을 모두 취소합니다.
  const requests = new AbortController();

  function update(patch: Partial<RecordsView>) {
    if (disposed) return;
    view = { ...view, ...patch };
    hooks.onView(view);
  }

  function leaveToLogin() {
    appActions.markLoggedOut();
    if (disposed || exited) return;
    exited = true;
    hooks.onExit("login");
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
    if (isUnauthenticated(error)) {
      leaveToLogin();
      return;
    }
    show(getErrorMessage(error));
  }

  async function load() {
    if (view.phase !== "loading") update({ ...initialRecordsView });
    try {
      // 새로고침하면 store의 로그인 상태가 사라지므로 서버에 확인합니다.
      if (!getAppState().loggedIn) {
        const member = await loadMember(requests.signal);
        if (member === "loggedOut") {
          leaveToLogin();
          return;
        }
      }
      const page = await listRecords(
        { page: 0, size: RECORDS_PAGE_SIZE },
        requests.signal,
      );
      update({
        phase: "ready",
        records: page.records,
        hasNext: page.hasNext,
      });
    } catch (error) {
      handleFailure(
        error,
        () => update({ phase: "error", message: null }),
        (message) => update({ phase: "error", message }),
      );
    }
  }

  async function loadMore() {
    if (view.phase !== "ready" || !view.hasNext || view.loadingMore) return;
    update({ loadingMore: true, moreMessage: null });
    try {
      const page = await listRecords(
        {
          page: nextPageOf(view.records.length, RECORDS_PAGE_SIZE),
          size: RECORDS_PAGE_SIZE,
        },
        requests.signal,
      );
      update({
        loadingMore: false,
        records: mergeRecords(view.records, page.records),
        hasNext: page.hasNext,
      });
    } catch (error) {
      handleFailure(
        error,
        () => update({ loadingMore: false }),
        (message) => update({ loadingMore: false, moreMessage: message }),
      );
    }
  }

  async function remove(medicalRecordId: number): Promise<boolean> {
    if (view.phase !== "ready" || view.deletingId !== null) return false;
    update({ deletingId: medicalRecordId, deleteMessage: null });
    let removed = false;
    try {
      await deleteRecord(medicalRecordId, requests.signal);
      removed = true;
    } catch (error) {
      // 이미 지워진 기록(SUMMARY_404)은 원하는 상태이므로 목록에서만 뺍니다.
      if (isApiError(error) && error.code === "SUMMARY_404") {
        removed = true;
      } else {
        handleFailure(
          error,
          () => update({ deletingId: null }),
          (message) => update({ deletingId: null, deleteMessage: message }),
        );
      }
    }
    if (removed) {
      update({
        deletingId: null,
        records: view.records.filter(
          (record) => record.medicalRecordId !== medicalRecordId,
        ),
      });
    }
    return removed;
  }

  function dispose() {
    disposed = true;
    requests.abort();
  }

  return { load, loadMore, remove, dispose };
}
