import {
  ApiError,
  getErrorMessage,
  getFieldErrors,
  INVALID_RESPONSE,
  isSessionGone,
} from "@/api/errors";
import {
  confirmSummary,
  getSummary,
  isSummaryConflict,
  updateSummary,
  type SummaryContent,
} from "@/api/summaries";
import type { FieldError, IsoDateTime } from "@/api/types";
import {
  buildSummaryUpdate,
  canSaveEdits,
  type SummaryEdits,
} from "@/pages/summary/editSummary";
import {
  clearSummarySession,
  readSummarySession,
  type SummarySession,
} from "@/stores/summarySession";

// S06(요약지)의 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 화면은 onView로 받은 view를 그리고, onExit로 받은 곳으로 이동합니다.

export interface SummaryScreenView {
  // loading: 불러오는 중, ready: 요약지를 보여 주는 중, error: 불러오지 못함
  phase: "loading" | "ready" | "error";
  // 이 화면이 보여 주는 요약지의 문진·요약지 ID입니다. 세션을 열기 전에는 null입니다.
  session: SummarySession | null;
  // phase가 ready일 때만 있습니다.
  summary: SummaryContent | null;
  // 서버가 요약지를 만든 시각입니다. 요약지 머리말에 보여 줍니다.
  createdAt: IsoDateTime | null;
  // 수정 폼을 열어 둔 중입니다.
  editing: boolean;
  // 확인·저장 요청이 진행 중이면 어떤 요청인지 알려 줍니다. 버튼을 잠가 이중 전송을 막습니다.
  busy: "confirm" | "save" | null;
  // phase가 error일 때의 안내입니다.
  message: string | null;
  // "내용이 맞아요"가 실패했을 때의 안내입니다.
  confirmMessage: string | null;
  // 수정 저장이 실패했을 때의 안내와 항목별 이유(비어 있을 수 있음)입니다. 수정 폼은 열린 채로 입력을 유지합니다.
  saveMessage: string | null;
  saveFieldErrors: FieldError[];
}

export const initialSummaryView: SummaryScreenView = {
  phase: "loading",
  session: null,
  summary: null,
  createdAt: null,
  editing: false,
  busy: null,
  message: null,
  confirmMessage: null,
  saveMessage: null,
  saveFieldErrors: [],
};

// loading: 요약지가 아직 만들어지는 중이거나 실패해서 /summary-loading으로 갑니다.
// start: 기억한 ID를 지우고 처음(/)으로 갑니다. 세션이 없거나 서버에 없을 때입니다.
export type SummaryScreenExit = "loading" | "start";

export interface SummaryScreenHooks {
  onView: (view: SummaryScreenView) => void;
  onExit: (to: SummaryScreenExit) => void;
}

export interface SummaryScreen {
  // 세션을 열고 요약지를 불러옵니다. 실패해서 보이는 "다시 시도"도 이 함수입니다.
  load: () => Promise<void>;
  // "내용이 맞아요". 성공했을 때만 확인된 상태로 바뀝니다.
  confirm: () => Promise<void>;
  startEdit: () => void;
  cancelEdit: () => void;
  // 수정 저장. 바뀐 칸이 없으면 요청하지 않고 폼만 닫습니다. 실패하면 폼을 열어 둡니다.
  save: (edits: SummaryEdits) => Promise<void>;
  // 화면을 떠날 때 부릅니다. 진행 중인 요청을 취소하고 더는 view나 이동을 알리지 않습니다.
  dispose: () => void;
}

export function createSummaryScreen(hooks: SummaryScreenHooks): SummaryScreen {
  let view = initialSummaryView;
  let session: SummarySession | null = null;
  let disposed = false;
  let exited = false;
  // 화면을 떠나면 진행 중인 요청을 모두 취소합니다.
  const requests = new AbortController();

  function update(patch: Partial<SummaryScreenView>) {
    if (disposed) return;
    view = { ...view, ...patch };
    hooks.onView(view);
  }

  function leave(to: SummaryScreenExit) {
    if (to === "start") clearSummarySession();
    if (disposed || exited) return;
    exited = true;
    hooks.onExit(to);
  }

  // 요약지가 없어졌거나(403, 404) 아직 만드는 중이면(SUMMARY_409) 이 화면에서 할 수 있는 일이 없어 다른 화면으로 보냅니다.
  function routeAway(error: unknown): boolean {
    if (isSessionGone(error)) {
      leave("start");
      return true;
    }
    if (isSummaryConflict(error)) {
      leave("loading");
      return true;
    }
    return false;
  }

  async function load() {
    if (view.phase !== "loading") update({ phase: "loading", message: null });
    try {
      if (!session) {
        session = readSummarySession();
        if (!session) {
          leave("start");
          return;
        }
        update({ session });
      }
      const response = await getSummary(session.summaryId, requests.signal);
      if (response.status !== "DONE") {
        // GENERATING이나 FAILED는 만드는 중 화면이 이어서 맡습니다.
        leave("loading");
        return;
      }
      if (!response.summary) throw new ApiError(INVALID_RESPONSE, "", 200);
      update({
        phase: "ready",
        summary: response.summary,
        createdAt: response.createdAt,
      });
    } catch (error) {
      if (requests.signal.aborted) return;
      if (routeAway(error)) return;
      update({ phase: "error", message: getErrorMessage(error) });
    }
  }

  async function confirm() {
    const current = view.summary;
    if (!session || !current || view.busy || view.editing) return;
    if (current.isConfirmed) return;
    update({ busy: "confirm", confirmMessage: null });
    try {
      const result = await confirmSummary(session.summaryId, requests.signal);
      // 서버가 성공을 알린 뒤에만 확인된 상태로 보여 줍니다.
      update({
        busy: null,
        summary: { ...current, isConfirmed: result.isConfirmed },
      });
    } catch (error) {
      if (requests.signal.aborted) return;
      if (routeAway(error)) return;
      update({ busy: null, confirmMessage: getErrorMessage(error) });
    }
  }

  function startEdit() {
    if (view.phase !== "ready" || view.busy) return;
    update({
      editing: true,
      confirmMessage: null,
      saveMessage: null,
      saveFieldErrors: [],
    });
  }

  function cancelEdit() {
    if (view.busy === "save") return;
    update({ editing: false, saveMessage: null, saveFieldErrors: [] });
  }

  async function save(edits: SummaryEdits) {
    const current = view.summary;
    if (!session || !current || view.busy || !view.editing) return;
    if (!canSaveEdits(edits)) return;

    const request = buildSummaryUpdate(current, edits);
    if (Object.keys(request).length === 0) {
      // 바꾼 곳이 없으면 요청하지 않아 확인한 상태도 그대로 둡니다.
      update({ editing: false, saveMessage: null, saveFieldErrors: [] });
      return;
    }

    update({ busy: "save", saveMessage: null, saveFieldErrors: [] });
    try {
      const response = await updateSummary(
        session.summaryId,
        request,
        requests.signal,
      );
      if (!response.summary) throw new ApiError(INVALID_RESPONSE, "", 200);
      // 서버가 돌려준 요약지로 바꿉니다. 수정했으므로 isConfirmed는 서버가 false로 돌려줍니다.
      update({
        busy: null,
        editing: false,
        summary: response.summary,
        createdAt: response.createdAt,
        confirmMessage: null,
      });
    } catch (error) {
      if (requests.signal.aborted) return;
      if (routeAway(error)) return;
      update({
        busy: null,
        saveMessage: getErrorMessage(error),
        saveFieldErrors: getFieldErrors(error),
      });
    }
  }

  function dispose() {
    disposed = true;
    requests.abort();
  }

  return { load, confirm, startEdit, cancelEdit, save, dispose };
}
