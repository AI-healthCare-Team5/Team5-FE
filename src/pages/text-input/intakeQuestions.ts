import {
  ApiError,
  getErrorMessage,
  INVALID_RESPONSE,
  isApiError,
  isSessionGone,
} from "@/api/errors";
import {
  answerIntake,
  cancelIntake,
  getIntake,
  goBackIntake,
  type IntakeResponse,
  type IntakeStepResult,
} from "@/api/intakes";
import {
  clearIntakeSession,
  readIntakeSession,
  rememberAnswer,
  updateIntakeSession,
  type IntakeSession,
  type SubmittedAnswer,
} from "@/stores/intakeSession";
import {
  clearSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";
import { appActions } from "@/stores/appStore";
import { toEmergencyEntry, type EmergencyEntry } from "@/stores/emergency";

// S04a(추가 질문)의 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 화면은 onView로 받은 view를 그리고, onExit로 받은 곳으로 이동합니다.
// 화면에는 서버가 확인해 준 문진 상태만 보여 줍니다. 요청이 성공하기 전에는 다음 질문으로 넘어가지 않습니다.

export interface IntakeQuestionsView {
  // 서버가 마지막으로 알려 준 문진 상태입니다.
  // IN_PROGRESS면 question을 묻고, COMPLETED면 "정리했어요" 화면을 보여 줍니다.
  intake: IntakeResponse;
  // 답변·이전 질문 요청이 진행 중이면 true입니다. 선택지와 버튼을 잠가 이중 전송을 막습니다.
  busy: boolean;
  // 요청이 실패했을 때의 안내입니다. 같은 질문에 머물며, 다시 보내면 재시도입니다.
  message: string | null;
  // 이전 질문으로 돌아왔을 때 다시 보여 줄 직전 답입니다. 없으면 null입니다.
  restored: SubmittedAnswer | null;
}

// text-input: 첫 질문에서 이전으로 가서 S04의 부위·시작 시점을 다시 고릅니다.
// emergency: 서버가 위험 신호로 판정해 문진을 멈추고 응급 안내(E01)로 갑니다. 응급 정보는 appActions.enterEmergency로 넘깁니다.
// start: 문진이 없어졌거나 취소돼 처음(/)으로 갑니다.
export type IntakeQuestionsExit = "text-input" | "emergency" | "start";

export interface IntakeQuestionsHooks {
  onView: (view: IntakeQuestionsView) => void;
  onExit: (to: IntakeQuestionsExit) => void;
}

export interface IntakeQuestions {
  // 지금 질문에 답합니다. 성공한 응답이 올 때까지 다음 질문으로 넘어가지 않습니다.
  submit: (answer: SubmittedAnswer) => Promise<void>;
  // "← 이전 질문". 첫 질문이면 서버에 요청하지 않고 S04로 돌아갑니다.
  back: () => Promise<void>;
  // 화면을 떠날 때 부릅니다. 진행 중인 요청을 취소하고 더는 view나 이동을 알리지 않습니다.
  dispose: () => void;
}

// 이 화면에서 보여 줄 수 있는 문진인지 알려 줍니다.
// 질문이 있는 진행 중이거나 끝난 문진만 그립니다. 응급·취소된 문진이나 질문 없는 응답은 쓰지 않습니다.
export function canShowIntake(
  session: IntakeSession | null,
): session is IntakeSession {
  if (!session) return false;
  const { status, question } = session.intake;
  return (
    (status === "IN_PROGRESS" && question !== null) || status === "COMPLETED"
  );
}

export function initialQuestionsView(
  session: IntakeSession,
): IntakeQuestionsView {
  return { intake: session.intake, busy: false, message: null, restored: null };
}

// S04의 버튼 입력으로 시작한 문진은 BASIC_INFO부터 묻고, progress는 1부터 셉니다.
function isFirstQuestion(intake: IntakeResponse): boolean {
  return intake.stage === "BASIC_INFO" && intake.progress.current === 1;
}

// 서버가 이 답을 받아 다음으로 넘어갔는지 알려 줍니다.
// 못 알아듣고 같은 질문을 다시 묻는 경우(reask)에는 답을 받지 않은 것입니다.
function movedOn(asked: string, next: IntakeResponse): boolean {
  return !(
    next.status === "IN_PROGRESS" && next.question?.questionId === asked
  );
}

export function createIntakeQuestions(
  session: IntakeSession,
  hooks: IntakeQuestionsHooks,
): IntakeQuestions {
  let view = initialQuestionsView(session);
  let disposed = false;
  let exited = false;
  // 화면을 떠나면 진행 중인 요청을 모두 취소합니다.
  const requests = new AbortController();

  function update(patch: Partial<IntakeQuestionsView>) {
    if (disposed) return;
    view = { ...view, ...patch };
    hooks.onView(view);
  }

  function leave(to: IntakeQuestionsExit) {
    if (disposed || exited) return;
    exited = true;
    hooks.onExit(to);
  }

  // 서버에 없는 문진이라 더는 이어갈 수 없을 때입니다. 기억한 것을 모두 지우고 처음으로 갑니다.
  function forget() {
    clearIntakeSession();
    clearSummarySession();
    leave("start");
  }

  // 서버가 위험 신호로 판정해 문진을 멈췄습니다. E01이 보여 줄 응급 정보를 기억하고 응급 안내로 갑니다.
  function escalate(emergency: EmergencyEntry) {
    clearIntakeSession();
    if (disposed || exited) return;
    appActions.enterEmergency(emergency);
    leave("emergency");
  }

  // 서버가 알려 준 새 상태를 화면에 반영합니다.
  function apply(
    next: IntakeResponse,
    restored: SubmittedAnswer | null = null,
  ) {
    const emergency = toEmergencyEntry(next);
    if (emergency) {
      escalate(emergency);
      return;
    }
    if (next.status === "CANCELED") {
      forget();
      return;
    }
    if (next.status === "IN_PROGRESS" && !next.question) {
      // 질문 없이 진행 중이라는 응답은 그릴 수 없습니다. 이전 질문에 머물고 다시 시도하게 합니다.
      update({
        busy: false,
        message: getErrorMessage(new ApiError(INVALID_RESPONSE, "", 200)),
      });
      return;
    }
    updateIntakeSession(next);
    if (next.status === "COMPLETED" && next.summaryId) {
      // 요약지 화면(S06a, S06)이 어느 요약지를 보여 줄지 알도록 ID만 기억합니다.
      saveSummarySession({
        intakeId: next.intakeId,
        summaryId: next.summaryId,
      });
    }
    update({ intake: next, busy: false, message: null, restored });
  }

  // 답변·이전 질문의 결과를 반영합니다.
  async function settle(
    result: IntakeStepResult,
    restoreFor?: (next: IntakeResponse) => SubmittedAnswer | null,
  ) {
    if (result.kind === "advanced") {
      apply(result.intake, restoreFor?.(result.intake) ?? null);
      return;
    }
    if (result.kind === "resynced") {
      // 중복 전송이라 서버의 현재 질문으로 다시 맞췄습니다. 이 요청의 답은 반영되지 않았습니다.
      apply(result.intake);
      return;
    }
    // INTAKE_409(result.status 있음): 이미 끝난 문진입니다. 그 상태에 맞게 보냅니다.
    if (result.status === "COMPLETED") {
      // 완료 응답의 진료과와 요약지 ID가 필요하니 다시 조회합니다.
      apply(await getIntake(view.intake.intakeId, requests.signal));
    } else if (result.status === "EMERGENCY") {
      // 응답에 응급 정보가 없어 "말씀하신 내용"은 비워 둡니다. 다시 조회하지 않고 바로 119 안내로 갑니다.
      escalate({ intakeId: view.intake.intakeId, userUtterance: null });
    } else {
      forget();
    }
  }

  // 요청이 실패했을 때입니다. 코드 실수는 서버 오류 안내로 바꾸지 않고, 화면만 풀어 준 뒤 그대로 던집니다.
  function fail(error: unknown) {
    if (!isApiError(error)) {
      update({ busy: false });
      throw error;
    }
    if (isSessionGone(error)) {
      forget();
      return;
    }
    update({ busy: false, message: getErrorMessage(error) });
  }

  async function submit(answer: SubmittedAnswer) {
    const { intake } = view;
    const { question } = intake;
    if (view.busy || intake.status !== "IN_PROGRESS" || !question) return;
    // 서버는 빈 답을 받지 않습니다. 화면에서 막지만 여기서도 보내지 않습니다.
    if (answer.answer.trim() === "") return;

    update({ busy: true, message: null });
    try {
      const result = await answerIntake(
        intake.intakeId,
        {
          questionId: question.questionId,
          inputMode: answer.inputMode,
          answer: answer.answer,
        },
        requests.signal,
      );
      if (requests.signal.aborted) return;
      // 서버가 이 답을 받아 넘어갔을 때만 기억합니다. 이전 질문으로 돌아오면 이 답을 다시 보여 줍니다.
      if (
        result.kind === "advanced" &&
        movedOn(question.questionId, result.intake)
      ) {
        rememberAnswer(intake.intakeId, question.questionId, answer);
      }
      await settle(result);
    } catch (error) {
      if (requests.signal.aborted) return;
      fail(error);
    }
  }

  // 첫 질문에서 이전으로 가면 S04로 돌아갑니다. 시작한 문진은 쓰지 않으니 지웁니다.
  function returnToStart() {
    cancelIntake(view.intake.intakeId).catch(() => undefined);
    clearIntakeSession();
    leave("text-input");
  }

  async function back() {
    const { intake } = view;
    if (view.busy || intake.status !== "IN_PROGRESS") return;
    if (isFirstQuestion(intake)) {
      returnToStart();
      return;
    }

    update({ busy: true, message: null });
    try {
      const result = await goBackIntake(intake.intakeId, requests.signal);
      if (requests.signal.aborted) return;
      await settle(result, (next) => {
        const questionId = next.question?.questionId;
        return questionId
          ? (readIntakeSession()?.answers[questionId] ?? null)
          : null;
      });
    } catch (error) {
      if (requests.signal.aborted) return;
      // INTAKE_400: 서버가 첫 질문이라 돌아갈 수 없다고 합니다. 처음 입력 화면으로 갑니다.
      if (isApiError(error) && error.code === "INTAKE_400") {
        returnToStart();
        return;
      }
      fail(error);
    }
  }

  function dispose() {
    disposed = true;
    requests.abort();
  }

  return { submit, back, dispose };
}
