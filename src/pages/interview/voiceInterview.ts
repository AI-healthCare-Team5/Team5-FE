import type { IntakeResponse } from "@/api/intakes";
import type { VoiceRecording } from "@/lib/voice/recorder";
import type { SttFailure } from "@/lib/voice/sttFailure";
import { transcribeRecording } from "@/lib/voice/transcribe";
import { beginVoiceIntake } from "@/pages/text-input/beginIntake";
import {
  canShowIntake,
  createIntakeQuestions,
  type IntakeQuestions,
} from "@/pages/text-input/intakeQuestions";
import type { IntakeOption } from "@/stores/intakeFlow";
import { readIntakeSession, type IntakeSession } from "@/stores/intakeSession";

// S03(음성 문진)의 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 말한 내용은 POST /api/stt로 글자로 바꾼 뒤, 문진 시작(POST /api/intakes)이나 답변(POST /api/intakes/{intakeId}/answers)에
// inputMode=VOICE로 보냅니다(답변 API는 음성을 직접 받지 않습니다).
// 답변·이전 질문·응급 전환·완료 처리는 S04a와 같은 intakeQuestions.ts를 써서, 글로 바꿔도 같은 문진을 이어갑니다.

// idle: 쉬는 중 / transcribing: 녹음을 글자로 바꾸는 중 / sending: 문진을 시작하는 중
type Phase = "idle" | "transcribing" | "sending";

export interface VoiceInterviewView {
  // 서버가 마지막으로 알려 준 문진 상태입니다. 첫 증상을 말하기 전에는 null입니다.
  intake: IntakeResponse | null;
  // 녹음을 글자로 바꾸거나 문진 요청이 진행 중이면 true입니다. 마이크와 선택지를 잠급니다.
  busy: boolean;
  // 녹음을 글자로 바꾸는 중이면 true입니다.
  transcribing: boolean;
  // 음성 인식이 실패했을 때의 안내입니다. 다음 녹음이나 선택을 하면 지워집니다.
  failure: SttFailure | null;
  // 문진 요청이 실패했을 때의 안내입니다.
  message: string | null;
  // true면 "글로 입력하기"를 눈에 띄게 안내합니다. 음성으로 계속하기 어렵다는 실패이거나,
  // 글자로 바꾸기가 연속으로 실패해 같은 안내만 반복해서 보게 될 때 켭니다.
  suggestTextInput: boolean;
}

// 글자로 바꾸기가 이만큼 연속으로 실패하면 글로 입력하기를 강조합니다.
// 서버 오류(STT_ 코드가 아닌 실패)는 다시 시도하라는 안내만 나오므로, 반복되면 다른 길을 보여 줘야 합니다.
export const TEXT_INPUT_SUGGEST_AFTER_FAILURES = 2;

// emergency: 위험 신호로 판정돼 응급 안내(E01)로 갑니다. start: 문진이 없어져 처음(/)으로 갑니다.
export type VoiceInterviewExit = "emergency" | "start";

export interface VoiceInterviewHooks {
  onView: (view: VoiceInterviewView) => void;
  onExit: (to: VoiceInterviewExit) => void;
}

export interface VoiceInterview {
  // 녹음이 끝났을 때 부릅니다. 녹음은 글자로 바꾸는 동안만 쓰고 남기지 않습니다.
  submitRecording: (recording: VoiceRecording) => Promise<void>;
  // 버튼으로 답합니다(inputMode=BUTTON). 답변마다 입력 방식이 달라도 됩니다.
  chooseAnswer: (choice: IntakeOption) => Promise<void>;
  back: () => Promise<void>;
  // 화면을 떠날 때 부릅니다. 진행 중인 요청을 취소하고 더는 알리지 않습니다.
  dispose: () => void;
}

export function initialVoiceInterviewView(
  session: IntakeSession | null,
): VoiceInterviewView {
  return {
    intake: canShowIntake(session) ? session.intake : null,
    busy: false,
    transcribing: false,
    failure: null,
    message: null,
    suggestTextInput: false,
  };
}

export function createVoiceInterview(
  session: IntakeSession | null,
  hooks: VoiceInterviewHooks,
): VoiceInterview {
  let disposed = false;
  let phase: Phase = "idle";
  let questionsBusy = false;
  let view = initialVoiceInterviewView(session);
  let questions: IntakeQuestions | null = null;
  // 화면을 떠나면 글자로 바꾸는 요청과 문진 시작 요청을 취소합니다.
  const requests = new AbortController();
  // 글자로 바꾸기가 연속으로 실패한 횟수입니다. 글자로 바꾸는 데 성공하거나 버튼으로 답하면 0으로 돌아갑니다.
  let failureStreak = 0;

  function update(patch: Partial<VoiceInterviewView>) {
    if (disposed) return;
    view = { ...view, ...patch };
    view.transcribing = phase === "transcribing";
    view.busy = phase !== "idle" || questionsBusy;
    view.suggestTextInput =
      failureStreak >= TEXT_INPUT_SUGGEST_AFTER_FAILURES ||
      (view.failure?.suggestTextInput ?? false);
    hooks.onView(view);
  }

  // 시작한 문진을 이어서 묻는 컨트롤러를 만듭니다.
  function attach(current: IntakeSession) {
    questions?.dispose();
    questionsBusy = false;
    questions = createIntakeQuestions(current, {
      onView: ({ intake, busy, message }) => {
        questionsBusy = busy;
        update({ intake, message });
      },
      onExit: (to) => {
        if (to === "text-input") {
          // 첫 질문에서 이전으로 돌아왔습니다. 문진을 지웠으니 처음 증상을 다시 말하게 합니다.
          questions?.dispose();
          questions = null;
          questionsBusy = false;
          update({ intake: null, message: null, failure: null });
          return;
        }
        hooks.onExit(to);
      },
    });
  }

  if (canShowIntake(session)) attach(session);

  async function start(text: string) {
    phase = "sending";
    update({ failure: null, message: null });
    const result = await beginVoiceIntake(text, requests.signal);
    if (disposed || result.kind === "aborted") return;
    phase = "idle";
    // 아래에서 바로 이어서 update를 부르므로, 같은 순간에 한 번에 그려집니다.
    update({});
    if (result.kind === "emergency") {
      hooks.onExit("emergency");
      return;
    }
    if (result.kind === "failed") {
      update({ message: result.message });
      return;
    }
    const started = readIntakeSession();
    if (!canShowIntake(started)) {
      // 방금 시작한 문진이 없으면 코드 실수입니다. 숨기지 않고 알립니다.
      throw new Error("시작한 문진을 찾을 수 없어요.");
    }
    attach(started);
    update({ intake: started.intake });
  }

  async function submitRecording(recording: VoiceRecording) {
    if (disposed || view.busy) return;
    phase = "transcribing";
    update({ failure: null, message: null });
    const result = await transcribeRecording(recording, requests.signal);
    if (disposed || result.kind === "aborted") return;
    if (result.kind === "failed") {
      phase = "idle";
      failureStreak += 1;
      update({ failure: result.failure });
      return;
    }
    failureStreak = 0;
    if (questions) {
      // 이어서 묻는 중이면 같은 순간에 답변 요청이 busy를 이어받습니다.
      phase = "idle";
      update({});
      await questions.submit({ inputMode: "VOICE", answer: result.text });
      return;
    }
    await start(result.text);
  }

  async function chooseAnswer(choice: IntakeOption) {
    if (disposed || view.busy || !questions) return;
    failureStreak = 0;
    update({ failure: null });
    await questions.submit({ inputMode: "BUTTON", answer: choice.code });
  }

  async function back() {
    if (disposed || view.busy || !questions) return;
    update({ failure: null });
    await questions.back();
  }

  function dispose() {
    disposed = true;
    requests.abort();
    questions?.dispose();
    questions = null;
  }

  return { submitRecording, chooseAnswer, back, dispose };
}
