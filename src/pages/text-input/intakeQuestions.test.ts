import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  LLM_ERROR_MESSAGE,
  NETWORK_ERROR,
  SERVER_ERROR_MESSAGE,
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
  canShowIntake,
  createIntakeQuestions,
  type IntakeQuestionsExit,
  type IntakeQuestionsView,
} from "@/pages/text-input/intakeQuestions";
import {
  beginIntakeSession,
  readIntakeSession,
  resetIntakeFlow,
  type SubmittedAnswer,
} from "@/stores/intakeSession";
import {
  readSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";

vi.mock("@/api/intakes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/intakes")>()),
  answerIntake: vi.fn(),
  goBackIntake: vi.fn(),
  getIntake: vi.fn(),
  cancelIntake: vi.fn(),
}));

// 모든 값은 가짜 데이터입니다.
const answerMock = vi.mocked(answerIntake);
const backMock = vi.mocked(goBackIntake);
const getMock = vi.mocked(getIntake);
const cancelMock = vi.mocked(cancelIntake);

const buttonAnswer: SubmittedAnswer = {
  inputMode: "BUTTON",
  answer: "SIXTIES",
};
const textAnswer: SubmittedAnswer = { inputMode: "TEXT", answer: "혈압약" };

function question(
  questionId: string,
  answerType: "SINGLE_CHOICE" | "YES_NO_UNKNOWN" | "FREE_TEXT",
) {
  return {
    questionId,
    text: `${questionId} 질문`,
    answerType,
    options:
      answerType === "SINGLE_CHOICE"
        ? [{ code: "SIXTIES", label: "60대" }]
        : null,
  };
}

function intake(
  current: number,
  overrides: Partial<IntakeResponse> = {},
): IntakeResponse {
  const ids = [
    ["q_age_group", "SINGLE_CHOICE"],
    ["q_gender", "SINGLE_CHOICE"],
    ["q_medications", "FREE_TEXT"],
    ["q_conditions", "FREE_TEXT"],
    ["q_allergies", "FREE_TEXT"],
  ] as const;
  const [id, type] = ids[current - 1];
  return {
    intakeId: "intake-1",
    status: "IN_PROGRESS",
    stage: "BASIC_INFO",
    progress: { current, total: 5 },
    collected: ["다리 · 무릎"],
    question: question(id, type),
    reask: false,
    emergency: null,
    department: null,
    summaryId: null,
    ...overrides,
  };
}

const completed: IntakeResponse = {
  ...intake(5),
  status: "COMPLETED",
  progress: { current: 5, total: 5 },
  question: null,
  department: {
    departmentCode: "05",
    departmentName: "정형외과",
    recommendReason: "무릎 통증이 있어 정형외과 진료를 권해요.",
  },
  summaryId: "summary-1",
};

const advanced = (next: IntakeResponse): IntakeStepResult => ({
  kind: "advanced",
  intake: next,
});

function apiError(code: string, status: number, message = "서버 안내 문장") {
  return new ApiError(code, message, status);
}

// 호출한 쪽이 결과를 정할 때까지 끝나지 않는 promise입니다.
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(start: IntakeResponse = intake(1)) {
  beginIntakeSession(start);
  const session = readIntakeSession();
  if (!session) throw new Error("문진이 있어야 해요");
  const views: IntakeQuestionsView[] = [];
  const exits: IntakeQuestionsExit[] = [];
  const questions = createIntakeQuestions(session, {
    onView: (view) => views.push(view),
    onExit: (to) => exits.push(to),
  });
  return { questions, views, exits, last: () => views[views.length - 1] };
}

beforeEach(() => {
  answerMock.mockReset();
  backMock.mockReset();
  getMock.mockReset();
  cancelMock.mockReset();
  cancelMock.mockResolvedValue({ intakeId: "intake-1", status: "CANCELED" });
  const items = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    },
  });
  resetIntakeFlow();
});

afterEach(() => {
  resetIntakeFlow();
  vi.unstubAllGlobals();
});

describe("S04a 그릴 수 있는 문진", () => {
  it("질문이 있는 진행 중 문진과 끝난 문진만 그린다", () => {
    beginIntakeSession(intake(1));
    expect(canShowIntake(readIntakeSession())).toBe(true);

    beginIntakeSession(completed);
    expect(canShowIntake(readIntakeSession())).toBe(true);
  });

  it.each([
    ["문진이 없을 때", null],
    ["질문 없는 진행 중 응답", intake(1, { question: null })],
    ["응급 문진", intake(1, { status: "EMERGENCY", question: null })],
    ["취소된 문진", intake(1, { status: "CANCELED", question: null })],
  ])("%s는 그리지 않는다", (_name, start) => {
    if (start) beginIntakeSession(start);

    expect(canShowIntake(readIntakeSession())).toBe(false);
  });
});

describe("S04a 답변", () => {
  it("요청에 현재 질문의 id와 입력 방식·답을 보낸다", async () => {
    answerMock.mockResolvedValue(advanced(intake(2)));
    const { questions } = setup();

    await questions.submit(buttonAnswer);

    expect(answerMock).toHaveBeenCalledTimes(1);
    expect(answerMock.mock.calls[0][0]).toBe("intake-1");
    expect(answerMock.mock.calls[0][1]).toEqual({
      questionId: "q_age_group",
      inputMode: "BUTTON",
      answer: "SIXTIES",
    });
  });

  it("성공한 응답이 올 때까지 다음 질문으로 넘어가지 않고 버튼을 잠근다", async () => {
    const pending = deferred<IntakeStepResult>();
    answerMock.mockReturnValue(pending.promise);
    const { questions, last } = setup();

    const request = questions.submit(buttonAnswer);

    expect(last()).toMatchObject({ busy: true, message: null });
    expect(last().intake.progress.current).toBe(1);

    pending.resolve(advanced(intake(2)));
    await request;

    expect(last()).toMatchObject({ busy: false, message: null });
    expect(last().intake.progress.current).toBe(2);
    expect(last().intake.question?.questionId).toBe("q_gender");
  });

  it("요청 중에 다시 보내거나 이전으로 가도 요청하지 않는다", async () => {
    const pending = deferred<IntakeStepResult>();
    answerMock.mockReturnValue(pending.promise);
    const { questions } = setup();

    const first = questions.submit(buttonAnswer);
    await questions.submit(buttonAnswer);
    await questions.back();
    pending.resolve(advanced(intake(2)));
    await first;

    expect(answerMock).toHaveBeenCalledTimes(1);
    expect(backMock).not.toHaveBeenCalled();
  });

  it("빈 답은 보내지 않는다", async () => {
    const { questions, views } = setup(intake(3));

    await questions.submit({ inputMode: "TEXT", answer: "   " });

    expect(answerMock).not.toHaveBeenCalled();
    expect(views).toHaveLength(0);
  });

  it("글로 한 답은 앞뒤 공백까지 그대로 보낸다(다듬는 일은 화면이 한다)", async () => {
    answerMock.mockResolvedValue(advanced(intake(4)));
    const { questions } = setup(intake(3));

    await questions.submit({ inputMode: "TEXT", answer: "혈압약 하루 두 번" });

    expect(answerMock.mock.calls[0][1]).toEqual({
      questionId: "q_medications",
      inputMode: "TEXT",
      answer: "혈압약 하루 두 번",
    });
  });

  it("서버가 받은 답은 기억하고 서버가 알려 준 문진 상태도 기억한다", async () => {
    answerMock.mockResolvedValue(advanced(intake(2)));
    const { questions } = setup();

    await questions.submit(buttonAnswer);

    expect(readIntakeSession()?.answers).toEqual({
      q_age_group: buttonAnswer,
    });
    expect(readIntakeSession()?.intake.progress.current).toBe(2);
  });

  it("못 알아듣고 같은 질문을 다시 물으면 reask로 보여 주고 그 답은 기억하지 않는다", async () => {
    answerMock.mockResolvedValue(
      advanced(intake(3, { reask: true, collected: ["다리 · 무릎"] })),
    );
    const { questions, last } = setup(intake(3));

    await questions.submit(textAnswer);

    expect(last().intake.reask).toBe(true);
    expect(last().intake.progress.current).toBe(3);
    expect(last().busy).toBe(false);
    expect(readIntakeSession()?.answers).toEqual({});
  });

  it("중복 전송(INTAKE_409, result 없음)이면 서버의 현재 질문으로 맞추고 답은 기억하지 않는다", async () => {
    answerMock.mockResolvedValue({ kind: "resynced", intake: intake(2) });
    const { questions, last, exits } = setup();

    await questions.submit(buttonAnswer);

    expect(last().intake.progress.current).toBe(2);
    expect(last().message).toBeNull();
    expect(exits).toEqual([]);
    expect(readIntakeSession()?.answers).toEqual({});
  });
});

describe("S04a 완료", () => {
  it("마지막 답이 받아들여지면 COMPLETED를 보여 주고 문진·요약지 ID와 진료과를 기억한다", async () => {
    answerMock.mockResolvedValue(advanced(completed));
    const { questions, last, exits } = setup(intake(5));

    await questions.submit(textAnswer);

    expect(last().intake.status).toBe("COMPLETED");
    expect(exits).toEqual([]);
    expect(readSummarySession()).toEqual({
      intakeId: "intake-1",
      summaryId: "summary-1",
    });
    expect(readIntakeSession()?.intake.department?.departmentName).toBe(
      "정형외과",
    );
    expect(readIntakeSession()?.answers.q_allergies).toEqual(textAnswer);
  });

  it("요약지 ID가 없는 완료 응답이어도 완료로 보여 주고 요약지 ID는 기억하지 않는다", async () => {
    answerMock.mockResolvedValue(advanced({ ...completed, summaryId: null }));
    const { questions, last } = setup(intake(5));

    await questions.submit(textAnswer);

    expect(last().intake.status).toBe("COMPLETED");
    expect(readSummarySession()).toBeNull();
  });

  it("이미 끝난 문진(INTAKE_409, COMPLETED)이면 다시 조회해 완료 상태를 보여 준다", async () => {
    answerMock.mockResolvedValue({ kind: "ended", status: "COMPLETED" });
    getMock.mockResolvedValue(completed);
    const { questions, last } = setup(intake(5));

    await questions.submit(textAnswer);

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock.mock.calls[0][0]).toBe("intake-1");
    expect(last().intake.status).toBe("COMPLETED");
    expect(readSummarySession()?.summaryId).toBe("summary-1");
  });

  it("완료 뒤에는 답하거나 이전으로 가도 요청하지 않는다", async () => {
    answerMock.mockResolvedValue(advanced(completed));
    const { questions } = setup(intake(5));
    await questions.submit(textAnswer);
    answerMock.mockClear();

    await questions.submit(textAnswer);
    await questions.back();

    expect(answerMock).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
  });
});

describe("S04a 응급과 없어진 문진", () => {
  it("답변에서 위험 신호로 판정되면 응급으로 보내고 문진을 지운다", async () => {
    answerMock.mockResolvedValue(
      advanced(
        intake(3, {
          status: "EMERGENCY",
          question: null,
          emergency: {
            userUtterance: "가슴이 조여요",
            redFlagCategory: "CHEST_PAIN",
          },
        }),
      ),
    );
    const { questions, exits, views } = setup(intake(3));

    await questions.submit(textAnswer);

    expect(exits).toEqual(["emergency"]);
    expect(readIntakeSession()).toBeNull();
    // 응급 상태를 질문 화면으로 그리지 않는다.
    expect(views.every((view) => view.intake.status === "IN_PROGRESS")).toBe(
      true,
    );
  });

  it("이미 응급으로 끝난 문진(INTAKE_409, EMERGENCY)이면 응급으로 보낸다", async () => {
    answerMock.mockResolvedValue({ kind: "ended", status: "EMERGENCY" });
    const { questions, exits } = setup(intake(3));

    await questions.submit(textAnswer);

    expect(exits).toEqual(["emergency"]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("이미 취소된 문진(INTAKE_409, CANCELED)이면 기억한 것을 지우고 처음으로 보낸다", async () => {
    answerMock.mockResolvedValue({ kind: "ended", status: "CANCELED" });
    const { questions, exits } = setup(intake(3));

    await questions.submit(textAnswer);

    expect(exits).toEqual(["start"]);
    expect(readIntakeSession()).toBeNull();
  });

  it.each(["INTAKE_403", "INTAKE_404"])(
    "%s이면 문진과 요약지 ID를 지우고 처음으로 보낸다",
    async (code) => {
      answerMock.mockRejectedValue(apiError(code, 404));
      const { questions, exits, last } = setup();
      saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });

      await questions.submit(buttonAnswer);

      expect(exits).toEqual(["start"]);
      expect(readIntakeSession()).toBeNull();
      expect(readSummarySession()).toBeNull();
      expect(last().message).toBeNull();
    },
  );

  it("응급 화면으로 한 번만 이동한다", async () => {
    answerMock.mockResolvedValue(
      advanced(intake(3, { status: "EMERGENCY", question: null })),
    );
    const { questions, exits } = setup(intake(3));

    await questions.submit(textAnswer);
    await questions.submit(textAnswer);

    expect(exits).toEqual(["emergency"]);
    expect(answerMock).toHaveBeenCalledTimes(1);
  });
});

describe("S04a 실패와 재시도", () => {
  it("AI 실패(INTAKE_503)는 공통 안내를 보이고 같은 질문에 머물며 다시 보내면 재시도다", async () => {
    answerMock.mockRejectedValueOnce(apiError("INTAKE_503", 503));
    answerMock.mockResolvedValueOnce(advanced(intake(4)));
    const { questions, last } = setup(intake(3));

    await questions.submit(textAnswer);

    expect(last()).toMatchObject({ busy: false, message: LLM_ERROR_MESSAGE });
    expect(last().intake.progress.current).toBe(3);
    expect(readIntakeSession()?.answers).toEqual({});

    await questions.submit(textAnswer);

    expect(answerMock).toHaveBeenCalledTimes(2);
    // 같은 questionId로 다시 보낸다.
    expect(answerMock.mock.calls[1][1]).toMatchObject({
      questionId: "q_medications",
    });
    expect(last()).toMatchObject({ busy: false, message: null });
    expect(last().intake.progress.current).toBe(4);
  });

  it("서버가 거절하면 서버 문장을 보이고, 네트워크 오류는 공통 서버 오류 문장을 보인다", async () => {
    answerMock.mockRejectedValueOnce(
      apiError("INTAKE_400", 400, "답변을 입력해 주세요"),
    );
    answerMock.mockRejectedValueOnce(new ApiError(NETWORK_ERROR, "", 0));
    const { questions, last } = setup(intake(3));

    await questions.submit(textAnswer);
    expect(last().message).toBe("답변을 입력해 주세요");

    await questions.submit(textAnswer);
    expect(last().message).toBe(SERVER_ERROR_MESSAGE);
  });

  it("다음 요청을 시작하면 이전 실패 안내를 지운다", async () => {
    answerMock.mockRejectedValueOnce(apiError("INTAKE_503", 503));
    const pending = deferred<IntakeStepResult>();
    answerMock.mockReturnValueOnce(pending.promise);
    const { questions, last } = setup(intake(3));
    await questions.submit(textAnswer);

    const retry = questions.submit(textAnswer);

    expect(last()).toMatchObject({ busy: true, message: null });
    pending.resolve(advanced(intake(4)));
    await retry;
  });

  it("다시 조회가 실패해도 안내를 보이고 질문에 머문다", async () => {
    answerMock.mockResolvedValue({ kind: "ended", status: "COMPLETED" });
    getMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));
    const { questions, last, exits } = setup(intake(5));

    await questions.submit(textAnswer);

    expect(last()).toMatchObject({
      busy: false,
      message: SERVER_ERROR_MESSAGE,
    });
    expect(last().intake.status).toBe("IN_PROGRESS");
    expect(exits).toEqual([]);
  });

  it("질문 없이 진행 중이라는 응답은 그리지 않고 안내만 보인다", async () => {
    answerMock.mockResolvedValue(advanced(intake(2, { question: null })));
    const { questions, last } = setup();

    await questions.submit(buttonAnswer);

    expect(last().intake.progress.current).toBe(1);
    expect(last().message).toBe(SERVER_ERROR_MESSAGE);
    expect(last().busy).toBe(false);
  });

  it("API 오류가 아닌 예외(코드 실수)는 서버 오류 안내로 바꾸지 않고 던지되 화면은 풀어 준다", async () => {
    answerMock.mockRejectedValue(new TypeError("개발자 실수"));
    const { questions, last } = setup();

    await expect(questions.submit(buttonAnswer)).rejects.toThrow("개발자 실수");

    expect(last()).toMatchObject({ busy: false, message: null });
  });
});

describe("S04a 이전 질문", () => {
  it("첫 질문에서는 서버에 요청하지 않고 S04로 돌아가며 시작한 문진을 지운다", async () => {
    const { questions, exits } = setup(intake(1));

    await questions.back();

    expect(backMock).not.toHaveBeenCalled();
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(cancelMock.mock.calls[0][0]).toBe("intake-1");
    expect(exits).toEqual(["text-input"]);
    expect(readIntakeSession()).toBeNull();
  });

  it("문진 지우기가 실패해도 S04로 돌아간다", async () => {
    cancelMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));
    const { questions, exits } = setup(intake(1));

    await questions.back();
    await Promise.resolve();

    expect(exits).toEqual(["text-input"]);
  });

  it("두 번째 질문부터는 서버에 이전 질문을 요청하고 직전에 한 답을 다시 보여 준다", async () => {
    answerMock.mockResolvedValue(advanced(intake(2)));
    backMock.mockResolvedValue(advanced(intake(1)));
    const { questions, last } = setup();
    await questions.submit(buttonAnswer);

    await questions.back();

    expect(backMock).toHaveBeenCalledTimes(1);
    expect(backMock.mock.calls[0][0]).toBe("intake-1");
    expect(last().intake.progress.current).toBe(1);
    expect(last().intake.question?.questionId).toBe("q_age_group");
    expect(last().restored).toEqual(buttonAnswer);
    expect(cancelMock).not.toHaveBeenCalled();
  });

  it("글로 한 답도 그대로 다시 보여 준다", async () => {
    answerMock.mockResolvedValue(advanced(intake(4)));
    backMock.mockResolvedValue(advanced(intake(3)));
    const { questions, last } = setup(intake(3));
    await questions.submit(textAnswer);

    await questions.back();

    expect(last().intake.question?.questionId).toBe("q_medications");
    expect(last().restored).toEqual(textAnswer);
  });

  it("한 번도 답하지 않은 질문으로 돌아오면 보여 줄 답이 없다", async () => {
    backMock.mockResolvedValue(advanced(intake(2)));
    const { questions, last } = setup(intake(3));

    await questions.back();

    expect(last().restored).toBeNull();
  });

  it("답을 바꿔 보내면 다음에 돌아올 때 바뀐 답을 보여 준다", async () => {
    answerMock.mockResolvedValue(advanced(intake(2)));
    backMock.mockResolvedValue(advanced(intake(1)));
    const { questions, last } = setup();
    await questions.submit(buttonAnswer);
    await questions.back();

    const changed: SubmittedAnswer = { inputMode: "BUTTON", answer: "OVER_80" };
    await questions.submit(changed);
    await questions.back();

    expect(last().restored).toEqual(changed);
  });

  it("돌아온 뒤 다시 답하면 보여 주던 답을 지운다", async () => {
    answerMock.mockResolvedValue(advanced(intake(2)));
    backMock.mockResolvedValue(advanced(intake(1)));
    const { questions, last } = setup();
    await questions.submit(buttonAnswer);
    await questions.back();
    expect(last().restored).toEqual(buttonAnswer);

    await questions.submit(buttonAnswer);

    expect(last().restored).toBeNull();
  });

  it("서버가 첫 질문이라 돌아갈 수 없다(INTAKE_400)고 하면 S04로 돌아간다", async () => {
    backMock.mockRejectedValue(apiError("INTAKE_400", 400));
    const { questions, exits } = setup(intake(2));

    await questions.back();

    expect(exits).toEqual(["text-input"]);
    expect(readIntakeSession()).toBeNull();
  });

  it("이전 질문 요청이 실패하면 안내를 보이고 그 질문에 머문다", async () => {
    backMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));
    const { questions, last, exits } = setup(intake(2));

    await questions.back();

    expect(last()).toMatchObject({
      busy: false,
      message: SERVER_ERROR_MESSAGE,
    });
    expect(last().intake.progress.current).toBe(2);
    expect(exits).toEqual([]);
  });

  it("이전 질문 요청 중에는 버튼을 잠그고 다시 요청하지 않는다", async () => {
    const pending = deferred<IntakeStepResult>();
    backMock.mockReturnValue(pending.promise);
    const { questions, last } = setup(intake(2));

    const first = questions.back();
    await questions.back();
    expect(last().busy).toBe(true);
    pending.resolve(advanced(intake(1)));
    await first;

    expect(backMock).toHaveBeenCalledTimes(1);
    expect(last().busy).toBe(false);
  });

  it("끝났다고 알려 주면(INTAKE_409, CANCELED) 처음으로 보낸다", async () => {
    backMock.mockResolvedValue({ kind: "ended", status: "CANCELED" });
    const { questions, exits } = setup(intake(2));

    await questions.back();

    expect(exits).toEqual(["start"]);
  });
});

describe("S04a 화면을 떠날 때", () => {
  it("진행 중인 요청을 취소하고, 응답이 와도 화면과 이동을 알리지 않는다", async () => {
    const pending = deferred<IntakeStepResult>();
    answerMock.mockReturnValue(pending.promise);
    const { questions, views, exits } = setup();
    const request = questions.submit(buttonAnswer);
    const viewCount = views.length;

    questions.dispose();
    const signal = answerMock.mock.calls[0][2];
    pending.resolve(advanced(completed));
    await request;

    expect(signal?.aborted).toBe(true);
    expect(views).toHaveLength(viewCount);
    expect(exits).toEqual([]);
  });

  it("취소 오류로 끝난 요청은 실패 안내를 보이지 않는다", async () => {
    answerMock.mockImplementation(async (_id, _request, signal) => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      signal?.throwIfAborted();
      return advanced(intake(2));
    });
    const { questions, views } = setup();

    const request = questions.submit(buttonAnswer);
    questions.dispose();
    await request;

    expect(views.every((view) => view.message === null)).toBe(true);
  });

  it("떠난 뒤에는 이전 질문이 요청해도 이동하지 않는다", async () => {
    const { questions, exits } = setup(intake(1));

    questions.dispose();
    await questions.back();

    expect(exits).toEqual([]);
  });
});
