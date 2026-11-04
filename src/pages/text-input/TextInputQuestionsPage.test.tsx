import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntakeAnswerChoices } from "@/pages/text-input/components/IntakeAnswerChoices";
import { TextInputQuestionsPage } from "@/pages/text-input/TextInputQuestionsPage";
import { appActions } from "@/stores/appStore";
import type { IntakeQuestion } from "@/stores/intakeFlow";

// 가짜 응답(VITE_API_MOCK)을 켠 상태를 기본으로 두고, 테스트마다 끌 수 있게 합니다.
const api = vi.hoisted(() => ({ mock: true }));
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  get isMockApi() {
    return api.mock;
  },
}));

afterEach(() => {
  api.mock = true;
});

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <TextInputQuestionsPage />
    </MemoryRouter>,
  );
}

const yesNoQuestion: IntakeQuestion = {
  questionId: "q_medications",
  text: "지금 드시는 약이 있나요?",
  answerType: "YES_NO_UNKNOWN",
  options: null,
};

describe("TextInputQuestionsPage", () => {
  it("S04 시작 요청이 없으면(새로고침·직접 진입) 질문을 그리지 않는다", () => {
    appActions.startInterview();

    expect(renderPage()).not.toContain("연세가 어떻게 되세요?");
  });

  it("서버 응답 모양의 질문·진행·모은 정보를 그린다", () => {
    appActions.prepareIntake({
      inputMode: "BUTTON",
      bodyPart: "HEAD",
      onset: "TODAY",
    });
    const markup = renderPage();

    expect(markup).toContain("질문 1 / 5");
    expect(markup).toContain("기본 정보");
    expect(markup).toContain("연세가 어떻게 되세요?");
    expect(markup).toContain("머리");
    expect(markup).toContain("오늘");
    expect(markup).toContain("50세 미만");
    expect(markup).toContain("← 이전 질문");
    expect(markup).not.toContain("다시 말씀해 주세요");
  });

  it("가짜 응답이 꺼진 실제 경로에서는 가짜 질문 없이 준비 중으로 보여 준다", () => {
    api.mock = false;
    appActions.prepareIntake({
      inputMode: "BUTTON",
      bodyPart: "HEAD",
      onset: "TODAY",
    });
    const markup = renderPage();

    expect(markup).toContain("질문을 준비 중이에요");
    expect(markup).not.toContain("연세가 어떻게 되세요?");
    expect(markup).not.toContain("병원 안내 보기");
  });
});

describe("IntakeAnswerChoices", () => {
  const render = (props: { reask?: boolean; initialCode?: string }) =>
    renderToStaticMarkup(
      <IntakeAnswerChoices
        question={yesNoQuestion}
        reask={props.reask ?? false}
        last={false}
        initialCode={props.initialCode}
        onSubmit={() => {}}
      />,
    );

  it("YES_NO_UNKNOWN 질문은 네·아니요·잘 모르겠어요 버튼을 그린다", () => {
    const markup = render({});

    expect(markup).toContain("네");
    expect(markup).toContain("아니요");
    expect(markup).toContain("잘 모르겠어요");
    expect(markup).not.toContain('aria-pressed="true"');
  });

  it("reask가 true면 '다시 말씀해 주세요' 안내를 보여 준다", () => {
    expect(render({ reask: true })).toContain("다시 말씀해 주세요");
    expect(render({})).not.toContain("다시 말씀해 주세요");
  });

  it("이전 질문으로 돌아오면 직전에 고른 답이 눌린 상태로 보인다", () => {
    const markup = render({ initialCode: "NO" });

    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup).toMatch(/aria-pressed="true"[^>]*>아니요</);
  });
});
