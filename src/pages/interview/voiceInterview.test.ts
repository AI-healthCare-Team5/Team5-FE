import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, SERVER_ERROR_MESSAGE } from "@/api/errors";
import {
  answerIntake,
  cancelIntake,
  goBackIntake,
  startIntake,
  type IntakeResponse,
  type IntakeStepResult,
} from "@/api/intakes";
import { recognizeSpeech } from "@/api/stt";
import type { VoiceRecording } from "@/lib/voice/recorder";
import {
  createVoiceInterview,
  initialVoiceInterviewView,
  type VoiceInterviewExit,
  type VoiceInterviewView,
} from "@/pages/interview/voiceInterview";
import {
  beginIntakeSession,
  readIntakeSession,
  resetIntakeFlow,
} from "@/stores/intakeSession";

vi.mock("@/api/stt", () => ({ recognizeSpeech: vi.fn() }));
vi.mock("@/api/intakes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/intakes")>()),
  startIntake: vi.fn(),
  answerIntake: vi.fn(),
  goBackIntake: vi.fn(),
  getIntake: vi.fn(),
  cancelIntake: vi.fn(),
}));

// 모든 값은 가짜 데이터입니다.
const sttMock = vi.mocked(recognizeSpeech);
const startMock = vi.mocked(startIntake);
const answerMock = vi.mocked(answerIntake);
const backMock = vi.mocked(goBackIntake);
const cancelMock = vi.mocked(cancelIntake);

const recording: VoiceRecording = {
  blob: new Blob(["가짜 녹음"], { type: "audio/webm" }),
  mimeType: "audio/webm",
  durationMs: 3000,
  reason: "user",
};

function intake(overrides: Partial<IntakeResponse> = {}): IntakeResponse {
  return {
    intakeId: "intake-1",
    status: "IN_PROGRESS",
    stage: "SYMPTOM",
    progress: { current: 1, total: 2 },
    collected: [],
    question: {
      questionId: "q_swelling",
      text: "아픈 곳이 부었나요?",
      answerType: "YES_NO_UNKNOWN",
      options: null,
    },
    reask: false,
    emergency: null,
    department: null,
    summaryId: null,
    ...overrides,
  };
}

const secondQuestion = intake({
  progress: { current: 2, total: 2 },
  collected: ["붓기: 네"],
  question: {
    questionId: "q_fall",
    text: "최근에 넘어지신 적이 있나요?",
    answerType: "YES_NO_UNKNOWN",
    options: null,
  },
});

const advanced = (next: IntakeResponse): IntakeStepResult => ({
  kind: "advanced",
  intake: next,
});

function sttError(status: number) {
  return new ApiError(`STT_${status}`, "서버 안내 문장", status);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup(session = readIntakeSession()) {
  const views: VoiceInterviewView[] = [];
  const exits: VoiceInterviewExit[] = [];
  const interview = createVoiceInterview(session, {
    onView: (view) => views.push(view),
    onExit: (to) => exits.push(to),
  });
  return { interview, views, exits, last: () => views[views.length - 1] };
}

beforeEach(() => {
  for (const mock of [sttMock, startMock, answerMock, backMock, cancelMock]) {
    mock.mockReset();
  }
  cancelMock.mockResolvedValue({ intakeId: "intake-1", status: "CANCELED" });
  const items = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
      removeItem: (key: string) => items.delete(key),
    },
  });
  resetIntakeFlow();
});

describe("S03 문진 시작", () => {
  it("문진이 없으면 질문 없이 시작하고, 인식한 글자를 VOICE로 보내 첫 질문을 받는다", async () => {
    sttMock.mockResolvedValue({ text: " 무릎이 아파요 ", durationSec: 3 });
    startMock.mockResolvedValue(intake());
    const { interview, last } = setup();
    expect(last()).toBeUndefined();

    await interview.submitRecording(recording);

    // 녹음 파일은 STT에만 올라가고, 문진에는 앞뒤 공백을 뺀 글자만 갑니다.
    expect(sttMock.mock.calls[0][0]).toBe(recording.blob);
    expect(startMock.mock.calls[0][0]).toEqual({
      inputMode: "VOICE",
      text: "무릎이 아파요",
    });
    expect(last()).toMatchObject({
      busy: false,
      failure: null,
      message: null,
    });
    expect(last().intake?.question?.questionId).toBe("q_swelling");
    expect(readIntakeSession()?.intake.intakeId).toBe("intake-1");
  });

  it("글자로 바꾸는 동안과 문진을 시작하는 동안 busy이고, 그동안 두 번째 녹음은 무시한다", async () => {
    const stt = deferred<{ text: string; durationSec: number }>();
    sttMock.mockReturnValue(stt.promise);
    startMock.mockResolvedValue(intake());
    const { interview, last } = setup();

    const first = interview.submitRecording(recording);
    expect(last()).toMatchObject({ busy: true, transcribing: true });
    await interview.submitRecording(recording);
    expect(sttMock).toHaveBeenCalledTimes(1);

    stt.resolve({ text: "무릎이 아파요", durationSec: 3 });
    await first;
    expect(last()).toMatchObject({ busy: false, transcribing: false });
  });

  it("시작하자마자 위험 신호면 응급 안내로 보낸다", async () => {
    sttMock.mockResolvedValue({ text: "가슴이 답답해요", durationSec: 3 });
    startMock.mockResolvedValue(
      intake({ status: "EMERGENCY", question: null }),
    );
    const { interview, exits, last } = setup();

    await interview.submitRecording(recording);

    expect(exits).toEqual(["emergency"]);
    expect(last().busy).toBe(false);
  });

  it("문진을 시작하지 못하면 안내하고, 다시 말하면 다시 시작한다", async () => {
    sttMock.mockResolvedValue({ text: "무릎이 아파요", durationSec: 3 });
    startMock.mockRejectedValueOnce(new ApiError("INTAKE_500", "", 500));
    startMock.mockResolvedValueOnce(intake());
    const { interview, last } = setup();

    await interview.submitRecording(recording);
    expect(last().message).toBe(SERVER_ERROR_MESSAGE);
    expect(last().intake).toBeNull();

    await interview.submitRecording(recording);
    expect(last().message).toBeNull();
    expect(last().intake?.question?.questionId).toBe("q_swelling");
  });
});

describe("S03 음성 답변", () => {
  async function started() {
    sttMock.mockResolvedValueOnce({ text: "무릎이 아파요", durationSec: 3 });
    startMock.mockResolvedValue(intake());
    const harness = setup();
    await harness.interview.submitRecording(recording);
    return harness;
  }

  it("현재 질문의 questionId와 inputMode=VOICE로 인식한 글자를 보내고 다음 질문으로 넘어간다", async () => {
    const { interview, last } = await started();
    sttMock.mockResolvedValueOnce({ text: "네", durationSec: 1 });
    answerMock.mockResolvedValue(advanced(secondQuestion));

    await interview.submitRecording(recording);

    expect(answerMock.mock.calls[0][0]).toBe("intake-1");
    expect(answerMock.mock.calls[0][1]).toEqual({
      questionId: "q_swelling",
      inputMode: "VOICE",
      answer: "네",
    });
    expect(last().intake?.question?.questionId).toBe("q_fall");
    expect(last().busy).toBe(false);
  });

  it("버튼으로 답하면 BUTTON으로 보낸다(답변마다 입력 방식이 달라도 된다)", async () => {
    const { interview, last } = await started();
    sttMock.mockResolvedValueOnce({ text: "네", durationSec: 1 });
    answerMock.mockResolvedValueOnce(advanced(secondQuestion));
    await interview.submitRecording(recording);

    answerMock.mockResolvedValueOnce(
      advanced(intake({ status: "COMPLETED", question: null })),
    );
    await interview.chooseAnswer({ code: "NO", label: "아니요" });

    expect(answerMock.mock.calls[1][1]).toEqual({
      questionId: "q_fall",
      inputMode: "BUTTON",
      answer: "NO",
    });
    expect(last().intake?.status).toBe("COMPLETED");
  });

  it("서버가 못 알아듣고 같은 질문을 다시 물으면(reask) 같은 질문에 머문다", async () => {
    const { interview, last } = await started();
    sttMock.mockResolvedValue({ text: "음...", durationSec: 1 });
    answerMock.mockResolvedValue(advanced(intake({ reask: true })));

    await interview.submitRecording(recording);

    expect(last().intake?.reask).toBe(true);
    expect(last().intake?.question?.questionId).toBe("q_swelling");
    // 다음에 다시 말하면 같은 질문에 대한 답으로 보냅니다.
    answerMock.mockResolvedValue(advanced(secondQuestion));
    await interview.submitRecording(recording);
    expect(answerMock.mock.calls[1][1].questionId).toBe("q_swelling");
  });

  it("답변이 위험 신호면 응급 안내로 보내고 기억한 문진을 지운다", async () => {
    const { interview, exits } = await started();
    sttMock.mockResolvedValue({ text: "숨이 안 쉬어져요", durationSec: 2 });
    answerMock.mockResolvedValue(
      advanced(intake({ status: "EMERGENCY", question: null })),
    );

    await interview.submitRecording(recording);

    expect(exits).toEqual(["emergency"]);
    expect(readIntakeSession()).toBeNull();
  });

  it("답변 요청이 실패하면 같은 질문에 머물고 안내한다", async () => {
    const { interview, last } = await started();
    sttMock.mockResolvedValue({ text: "네", durationSec: 1 });
    answerMock.mockRejectedValue(new ApiError("INTAKE_500", "", 500));

    await interview.submitRecording(recording);

    expect(last().message).toBe(SERVER_ERROR_MESSAGE);
    expect(last().intake?.question?.questionId).toBe("q_swelling");
    expect(last().busy).toBe(false);
  });
});

describe("S03 음성 인식(STT) 오류", () => {
  it.each([
    [400, "record-again", false],
    [413, "too-large", false],
    [415, "use-text", true],
    [422, "not-understood", false],
    [429, "use-text", true],
    [503, "use-text", true],
  ] as const)(
    "STT_%i이면 문진 요청 없이 안내하고 마이크를 풀어 준다",
    async (status, kind, suggestTextInput) => {
      sttMock.mockRejectedValue(sttError(status));
      const { interview, last } = setup();

      await interview.submitRecording(recording);

      expect(startMock).not.toHaveBeenCalled();
      expect(answerMock).not.toHaveBeenCalled();
      expect(last().failure?.kind).toBe(kind);
      expect(last().failure?.suggestTextInput).toBe(suggestTextInput);
      expect(last()).toMatchObject({ busy: false, transcribing: false });
    },
  );

  it("실패 안내는 다음 녹음을 시작하면 지워진다", async () => {
    sttMock.mockRejectedValueOnce(sttError(422));
    sttMock.mockResolvedValueOnce({ text: "무릎이 아파요", durationSec: 3 });
    startMock.mockResolvedValue(intake());
    const { interview, last } = setup();

    await interview.submitRecording(recording);
    expect(last().failure?.kind).toBe("not-understood");
    await interview.submitRecording(recording);

    expect(last().failure).toBeNull();
  });

  it("인식한 글자가 비어 있으면 답으로 보내지 않고 '다시 말씀해 주세요'로 안내한다", async () => {
    sttMock.mockResolvedValue({ text: "   ", durationSec: 1 });
    const { interview, last } = setup();

    await interview.submitRecording(recording);

    expect(startMock).not.toHaveBeenCalled();
    expect(last().failure?.kind).toBe("not-understood");
  });
});

describe("S03에서 글로 바꾸기", () => {
  it("말로 답한 뒤에도 기억한 문진은 현재 질문을 가리켜서, 글 입력이 같은 질문부터 이어받는다", async () => {
    sttMock.mockResolvedValueOnce({ text: "무릎이 아파요", durationSec: 3 });
    startMock.mockResolvedValue(intake());
    const { interview } = setup();
    await interview.submitRecording(recording);
    sttMock.mockResolvedValueOnce({ text: "네", durationSec: 1 });
    answerMock.mockResolvedValue(advanced(secondQuestion));
    await interview.submitRecording(recording);

    const session = readIntakeSession();

    expect(session?.intake.question?.questionId).toBe("q_fall");
    expect(session?.answers.q_swelling).toEqual({
      inputMode: "VOICE",
      answer: "네",
    });
    // 새 문진을 만들지 않았습니다.
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("이미 시작한 문진이 있으면(글 입력에서 돌아옴) 새로 시작하지 않고 현재 질문에 답한다", async () => {
    beginIntakeSession(secondQuestion);
    const session = readIntakeSession();
    const { interview, last } = setup(session);
    expect(last()).toBeUndefined();
    expect(
      initialVoiceInterviewView(session).intake?.question?.questionId,
    ).toBe("q_fall");
    sttMock.mockResolvedValue({ text: "아니요", durationSec: 1 });
    answerMock.mockResolvedValue(
      advanced(intake({ status: "COMPLETED", question: null })),
    );

    await interview.submitRecording(recording);

    expect(startMock).not.toHaveBeenCalled();
    expect(answerMock.mock.calls[0][1]).toEqual({
      questionId: "q_fall",
      inputMode: "VOICE",
      answer: "아니요",
    });
  });

  it("끝났거나 응급인 문진은 이어가지 않고 처음 증상부터 다시 묻는다", () => {
    for (const status of ["EMERGENCY", "CANCELED"] as const) {
      beginIntakeSession(intake({ status, question: null }));
      expect(initialVoiceInterviewView(readIntakeSession()).intake).toBeNull();
    }
  });
});

describe("S03 이전 질문", () => {
  it("말로 시작한 문진의 첫 질문에서 이전을 누르면 서버에 묻지 않고 문진을 지운 뒤 처음 증상부터 다시 묻는다", async () => {
    sttMock.mockResolvedValue({ text: "무릎이 아파요", durationSec: 3 });
    startMock.mockResolvedValue(intake());
    const { interview, last } = setup();
    await interview.submitRecording(recording);

    await interview.back();

    expect(backMock).not.toHaveBeenCalled();
    expect(cancelMock).toHaveBeenCalledWith("intake-1");
    expect(readIntakeSession()).toBeNull();
    expect(last().intake).toBeNull();
  });

  it("말로 시작한 문진의 기본 정보 첫 질문에서 이전을 누르면 직전 증상 질문으로 돌아간다", async () => {
    // 말·글로 시작하면 SYMPTOM부터 묻고, BASIC_INFO의 1번은 맨 처음 질문이 아닙니다.
    sttMock.mockResolvedValue({ text: "무릎이 아파요", durationSec: 3 });
    startMock.mockResolvedValue(intake());
    const { interview, last } = setup();
    await interview.submitRecording(recording);
    answerMock.mockResolvedValueOnce(
      advanced(
        intake({
          stage: "BASIC_INFO",
          progress: { current: 1, total: 5 },
          question: {
            questionId: "q_age_group",
            text: "연세가 어떻게 되세요?",
            answerType: "SINGLE_CHOICE",
            options: [{ code: "SIXTIES", label: "60대" }],
          },
        }),
      ),
    );
    await interview.chooseAnswer({ code: "NO", label: "아니요" });
    expect(last().intake?.stage).toBe("BASIC_INFO");
    backMock.mockResolvedValue(advanced(intake()));

    await interview.back();

    expect(backMock).toHaveBeenCalledTimes(1);
    expect(cancelMock).not.toHaveBeenCalled();
    expect(last().intake?.question?.questionId).toBe("q_swelling");
  });
});

describe("S03 화면을 떠날 때", () => {
  it("글자로 바꾸는 중에 떠나면 요청을 취소하고, 늦게 온 결과로 문진을 시작하지 않는다", async () => {
    const stt = deferred<{ text: string; durationSec: number }>();
    sttMock.mockReturnValue(stt.promise);
    const { interview, views } = setup();

    const pending = interview.submitRecording(recording);
    interview.dispose();
    const viewsAtLeave = views.length;
    stt.resolve({ text: "무릎이 아파요", durationSec: 3 });
    await pending;

    expect(sttMock.mock.calls[0][1]?.aborted).toBe(true);
    expect(startMock).not.toHaveBeenCalled();
    expect(views).toHaveLength(viewsAtLeave);
  });

  it("떠난 뒤에는 녹음·선택·이전 요청을 받지 않는다", async () => {
    const { interview } = setup();
    interview.dispose();

    await interview.submitRecording(recording);
    await interview.chooseAnswer({ code: "YES", label: "네" });
    await interview.back();

    expect(sttMock).not.toHaveBeenCalled();
    expect(answerMock).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
  });
});
