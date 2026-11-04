import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IntakeResponse } from "@/api/intakes";
import { REASK_MESSAGE } from "@/stores/intakeFlow";
import { VoiceRecorderError } from "@/lib/voice/recorder";
import { VoiceControl } from "@/pages/interview/components/VoiceControl";
import { InterviewPage } from "@/pages/interview/InterviewPage";
import { beginIntakeSession, resetIntakeFlow } from "@/stores/intakeSession";

// 마이크 오류를 화면에서 다루는 방식을 보려고 녹음 훅만 바꿉니다. 실제 마이크는 쓰지 않습니다.
const recorderState = vi.hoisted(() => ({
  error: null as import("@/lib/voice/recorder").VoiceRecorderError | null,
}));
vi.mock("@/lib/voice/useVoiceRecorder", () => ({
  useVoiceRecorder: () => ({
    status: "idle",
    error: recorderState.error,
    start: () => Promise.resolve(),
    stop: () => undefined,
    cancel: () => undefined,
    clearError: () => undefined,
  }),
}));
// 서버 렌더링에서는 Navigate가 이동하지 않으므로, 어디로 보내려는지 표시로 남깁니다.
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  Navigate: ({ to }: { to: string }) => <i data-navigate={to} />,
}));

// 모든 값은 가짜 데이터입니다.
function intake(overrides: Partial<IntakeResponse> = {}): IntakeResponse {
  return {
    intakeId: "intake-1",
    status: "IN_PROGRESS",
    stage: "SYMPTOM",
    progress: { current: 2, total: 7 },
    collected: ["무릎이 사흘째 아파요"],
    question: {
      questionId: "q_fall",
      text: "최근에 넘어지신 적이 있나요?",
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

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <InterviewPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  recorderState.error = null;
  resetIntakeFlow();
});

// 주소로 링크를 찾아 그 링크의 클래스를 돌려줍니다. 강조(primary)는 brand 배경으로 구분합니다.
function linkClass(markup: string, href: string): string {
  const match = new RegExp(`<a class="([^"]*)" href="${href}"`).exec(markup);
  if (!match) throw new Error(`${href} 링크가 없어요.`);
  return match[1];
}

describe("S03 음성 문진 화면", () => {
  it("문진을 시작하기 전에는 증상을 말하게 하고, 글로 입력하기는 S04로 보낸다", () => {
    const markup = renderPage();

    expect(markup).toContain("어디가 불편하세요?");
    expect(markup).toContain("말하기");
    expect(markup).toContain("버튼을 누르고 말씀해 주세요");
    expect(markup).toContain('href="/text-input"');
    expect(markup).not.toContain("이전 질문");
    expect(markup).not.toContain("질문 ");
    expect(markup.match(/<h1/g)).toHaveLength(1);
  });

  it("시작한 문진이 있으면 현재 질문과 선택지를 그리고, 글로 입력하기는 현재 질문부터 이어간다", () => {
    beginIntakeSession(intake());

    const markup = renderPage();

    expect(markup).toContain("최근에 넘어지신 적이 있나요?");
    expect(markup).toContain("질문 2 / 7");
    expect(markup).toContain("증상 확인");
    expect(markup).toContain("무릎이 사흘째 아파요");
    expect(markup).toContain("네");
    expect(markup).toContain("아니요");
    expect(markup).toContain("잘 모르겠어요");
    expect(markup).toContain("← 이전 질문");
    // 새 문진을 만들지 않고 같은 문진의 현재 질문으로 갑니다.
    expect(markup).toContain('href="/text-input/questions"');
    expect(markup).not.toContain("다시 말씀해 주세요");
  });

  it("FREE_TEXT 질문은 선택지 없이 말로 답하게 한다", () => {
    beginIntakeSession(
      intake({
        stage: "BASIC_INFO",
        question: {
          questionId: "q_medications",
          text: "지금 드시는 약이 있나요?",
          answerType: "FREE_TEXT",
          options: null,
        },
      }),
    );

    const markup = renderPage();

    expect(markup).toContain("지금 드시는 약이 있나요?");
    expect(markup).toContain("말하기");
    expect(markup).not.toContain('aria-pressed="');
  });

  it("서버가 같은 질문을 다시 묻는 중(reask)이면 '다시 말씀해 주세요'를 안내한다", () => {
    beginIntakeSession(intake({ reask: true }));

    expect(renderPage()).toContain("다시 말씀해 주세요");
  });

  it("끝난 문진은 마이크 없이 병원 안내로 이어 주고 글 입력은 숨긴다", () => {
    beginIntakeSession(intake({ status: "COMPLETED", question: null }));

    const markup = renderPage();

    expect(markup).toContain("정리했어요");
    expect(markup).toContain('href="/location"');
    expect(markup).not.toContain("말하기");
    expect(markup).not.toContain("글로 입력하기");
    expect(markup).not.toContain("이전 질문");
  });

  it("응급·취소된 문진은 이어가지 않고 처음 증상부터 묻는다", () => {
    beginIntakeSession(intake({ status: "EMERGENCY", question: null }));

    expect(renderPage()).toContain("어디가 불편하세요?");
  });

  it("마이크를 쓸 수 없고 문진을 시작하기 전이면 S02a로 보낸다", () => {
    recorderState.error = new VoiceRecorderError(
      "permission-denied",
      "마이크 사용이 허용되지 않았어요.",
    );

    expect(renderPage()).toContain('data-navigate="/mic-guide/unavailable"');
  });

  it.each(["permission-denied", "no-device", "unsupported"] as const)(
    "문진 중에 마이크가 %s이면 S02a로 보내지 않고 답을 지키며, 현재 질문 글 입력을 강조한다",
    (kind) => {
      beginIntakeSession(intake());
      recorderState.error = new VoiceRecorderError(
        kind,
        "마이크를 쓸 수 없어요.",
      );

      const markup = renderPage();

      // 앞서 답한 내용과 현재 질문이 그대로 남습니다.
      expect(markup).not.toContain("data-navigate");
      expect(markup).toContain("최근에 넘어지신 적이 있나요?");
      expect(markup).toContain("무릎이 사흘째 아파요");
      expect(markup).toContain("마이크를 쓸 수 없어요.");
      // 새 문진을 만드는 /text-input이 아니라, 같은 문진을 잇는 S04a로 가고 눈에 띄게 안내합니다.
      expect(markup).not.toContain('href="/text-input"');
      expect(linkClass(markup, "/text-input/questions")).toContain(
        "bg-brand text-white",
      );
    },
  );

  it("마이크 오류가 없으면 글로 입력하기를 강조하지 않는다", () => {
    beginIntakeSession(intake());

    expect(linkClass(renderPage(), "/text-input/questions")).toContain(
      "bg-surface",
    );
  });

  it("마이크는 질문 카드 바로 아래, 선택지보다 위에 있다", () => {
    beginIntakeSession(intake());

    const markup = renderPage();
    const question = markup.indexOf("최근에 넘어지신 적이 있나요?");
    const mic = markup.indexOf("음성으로 답하기");
    const firstChoice = markup.indexOf("잘 모르겠어요");
    const next = markup.indexOf("다음 질문");

    expect(question).toBeGreaterThan(-1);
    expect(mic).toBeGreaterThan(question);
    expect(firstChoice).toBeGreaterThan(mic);
    expect(next).toBeGreaterThan(firstChoice);
  });

  it("다시 묻는 안내는 REASK_MESSAGE 하나로 그리고 마이크보다 위에 둔다", () => {
    beginIntakeSession(intake({ reask: true }));

    const markup = renderPage();

    expect(markup.split(REASK_MESSAGE)).toHaveLength(2);
    expect(markup.indexOf(REASK_MESSAGE)).toBeLessThan(
      markup.indexOf("음성으로 답하기"),
    );
  });
});

describe("VoiceControl", () => {
  const noop = () => undefined;
  function render(
    props: Partial<Parameters<typeof VoiceControl>[0]> = {},
  ): string {
    return renderToStaticMarkup(
      <VoiceControl
        status="idle"
        busy={false}
        transcribing={false}
        onStart={noop}
        onStop={noop}
        onCancel={noop}
        {...props}
      />,
    );
  }

  it("쉬는 중에는 누르면 말하기를 시작하는 버튼이다", () => {
    const markup = render();

    expect(markup).toContain("말하기");
    expect(markup).not.toContain('disabled=""');
    expect(markup).not.toContain("녹음 취소");
  });

  it("듣는 중에는 말 마치기와 녹음 취소를 보여 준다", () => {
    const markup = render({ status: "recording" });

    expect(markup).toContain("듣고 있어요");
    expect(markup).toContain("말 마치기");
    expect(markup).toContain("녹음 취소");
    expect(markup).toContain("0:00");
  });

  it("마이크를 켜는 중에는 두 번 누르지 못하게 잠근다", () => {
    const markup = render({ status: "starting" });

    expect(markup).toContain("마이크를 켜는 중이에요");
    expect(markup).toContain('disabled=""');
  });

  it("글자로 바꾸는 중에는 마이크를 잠그고 안내한다", () => {
    const markup = render({ busy: true, transcribing: true });

    expect(markup).toContain("글자로 바꾸는 중이에요");
    expect(markup).toContain('disabled=""');
  });
});
