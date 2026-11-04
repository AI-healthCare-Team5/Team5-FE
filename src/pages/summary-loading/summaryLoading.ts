import { getErrorMessage, isApiError, isSessionGone } from "@/api/errors";
import { cancelIntake } from "@/api/intakes";
import {
  isSummaryConflict,
  pollSummary,
  retrySummary,
  type SummaryStepState,
} from "@/api/summaries";
import { resetIntakeFlow } from "@/stores/intakeSession";
import {
  readSummarySession,
  type SummarySession,
} from "@/stores/summarySession";

// S06a(요약지 만드는 중)의 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 화면은 onView로 받은 view를 그리고, onExit로 받은 곳으로 이동합니다.

export interface SummaryLoadingView {
  // polling: 만드는 중
  // needsRetry: 요약지 생성이 실패했거나 30초 안에 끝나지 않아 "다시 만들기"를 안내하는 중
  // error: 조회나 다시 만들기 요청이 실패해(네트워크 등) "다시 시도"를 안내하는 중
  phase: "polling" | "needsRetry" | "error";
  // 서버가 알려 준 단계입니다. 첫 응답 전에는 null입니다.
  steps: SummaryStepState[] | null;
  // needsRetry일 때만 있습니다.
  reason: "failed" | "timeout" | null;
  // error일 때 보여 줄 안내입니다.
  message: string | null;
  // 다시 만들기 요청이나 취소 요청이 진행 중이면 true입니다. 버튼을 잠급니다.
  busy: boolean;
  // 취소 요청이 실패했을 때의 안내입니다. 화면에 머뭅니다.
  cancelMessage: string | null;
}

export const initialLoadingView: SummaryLoadingView = {
  phase: "polling",
  steps: null,
  reason: null,
  message: null,
  busy: false,
  cancelMessage: null,
};

// summary: 요약지가 만들어졌으니 /summary로 갑니다.
// start: 기억한 ID를 지우고 처음(/)으로 갑니다. 세션이 없거나, 문진을 취소했거나, 서버에 없을 때입니다.
export type SummaryLoadingExit = "summary" | "start";

export interface SummaryLoadingHooks {
  onView: (view: SummaryLoadingView) => void;
  onExit: (to: SummaryLoadingExit) => void;
}

export interface SummaryLoading {
  // 세션을 열고 요약지가 만들어질 때까지 조회합니다. 조회가 끝나면 settle합니다.
  start: () => Promise<void>;
  // "다시 만들기"(needsRetry)와 "다시 시도"(error)입니다.
  retry: () => Promise<void>;
  // "취소하고 처음으로"입니다.
  cancel: () => Promise<void>;
  // 화면을 떠날 때 부릅니다. 진행 중인 조회를 취소하고 더는 view나 이동을 알리지 않습니다.
  dispose: () => void;
}

export function createSummaryLoading(
  hooks: SummaryLoadingHooks,
): SummaryLoading {
  let view = initialLoadingView;
  let session: SummarySession | null = null;
  let disposed = false;
  let exited = false;
  // 조회(와 다시 만들기 요청)를 취소하는 데 씁니다. 새로 시작하면 이전 것을 취소합니다.
  let run: AbortController | null = null;
  // 다시 만들기 요청 자체가 실패했다면 "다시 시도"는 그 요청부터 다시 합니다.
  let retryUnsent = false;

  function update(patch: Partial<SummaryLoadingView>) {
    if (disposed) return;
    view = { ...view, ...patch };
    hooks.onView(view);
  }

  function leave(to: SummaryLoadingExit) {
    // 화면을 떠난 뒤에 취소가 끝나도 서버에 없는 문진을 가리키지 않게, 기억한 문진과 요약지 ID를 모두 지웁니다.
    // 요약지 ID만 지우면 뒤로 가기로 돌아온 병원 안내(S05)와 추가 질문(S04a)이 없어진 문진을 계속 씁니다.
    if (to === "start") resetIntakeFlow();
    if (disposed || exited) return;
    exited = true;
    hooks.onExit(to);
  }

  // 코드 실수는 서버 오류 안내로 바꾸지 않고, 화면만 풀어 준 뒤 그대로 던집니다.
  function fail(error: unknown) {
    if (!isApiError(error)) {
      update({ busy: false });
      throw error;
    }
    if (isSessionGone(error)) {
      leave("start");
      return;
    }
    update({ phase: "error", message: getErrorMessage(error), busy: false });
  }

  async function poll(opened: SummarySession, requestRetry: boolean) {
    run?.abort();
    const current = new AbortController();
    run = current;
    update({
      phase: "polling",
      // 다시 만들면 이전 단계 표시를 처음부터 다시 보여 줍니다.
      steps: requestRetry ? null : view.steps,
      reason: null,
      message: null,
      busy: requestRetry,
    });

    try {
      if (requestRetry) {
        retryUnsent = true;
        try {
          await retrySummary(opened.intakeId, current.signal);
        } catch (error) {
          // SUMMARY_409: 이미 만드는 중이거나 만들어졌습니다. 오류가 아니라 폴링을 이어 갑니다.
          if (!isSummaryConflict(error)) throw error;
        }
        retryUnsent = false;
        update({ busy: false });
      }

      const result = await pollSummary(opened.summaryId, {
        signal: current.signal,
        onProgress: (response) => update({ steps: response.steps }),
      });
      if (result.kind === "done") {
        leave("summary");
        return;
      }
      update({
        phase: "needsRetry",
        reason: result.reason,
        steps: result.last?.steps ?? view.steps,
        busy: false,
      });
    } catch (error) {
      // 화면을 떠났거나 다른 조회로 바뀌었습니다.
      if (current.signal.aborted) return;
      fail(error);
    }
  }

  async function start() {
    session = readSummarySession();
    if (!session) {
      leave("start");
      return;
    }
    await poll(session, false);
  }

  async function retry() {
    if (disposed || exited || view.busy || view.phase === "polling") return;
    if (!session) {
      await start();
      return;
    }
    await poll(session, view.phase === "needsRetry" || retryUnsent);
  }

  async function cancel() {
    if (disposed || exited || view.busy || !session) return;
    const { intakeId } = session;
    const resumePolling = view.phase === "polling";
    // 지우는 동안 조회를 멈춥니다.
    run?.abort();
    update({ busy: true, cancelMessage: null });
    try {
      await cancelIntake(intakeId);
    } catch (error) {
      // 이미 없는 문진(403, 404)은 취소된 것과 같습니다.
      if (!isSessionGone(error)) {
        update({ busy: false, cancelMessage: getErrorMessage(error) });
        // 취소가 끝나기 전에 화면을 떠났다면 조회를 다시 시작하지 않습니다(아무도 멈추지 못합니다).
        if (disposed) return;
        if (resumePolling && session) void poll(session, retryUnsent);
        return;
      }
    }
    leave("start");
  }

  function dispose() {
    disposed = true;
    run?.abort();
  }

  return { start, retry, cancel, dispose };
}
