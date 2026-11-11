import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { IntakeResponse } from "@/api/intakes";
import { IntakeAnswerChoices } from "@/pages/text-input/components/IntakeAnswerChoices";
import { IntakeAnswerText } from "@/pages/text-input/components/IntakeAnswerText";
import { TextInputQuestionsPage } from "@/pages/text-input/TextInputQuestionsPage";
import type { IntakeQuestion } from "@/stores/intakeFlow";
import { beginIntakeSession, resetIntakeFlow } from "@/stores/intakeSession";

// 모든 값은 가짜 데이터입니다.
const ageQuestion: IntakeQuestion = {
  questionId: "q_age_group",
  text: "연세가 어떻게 되세요?",
  answerType: "SINGLE_CHOICE",
  options: [
    { code: "UNDER_50", label: "50대 이하" },
    { code: "SIXTIES", label: "60대" },
    { code: "SEVENTIES", label: "70대" },
    { code: "OVER_80", label: "80대 이상" },
  ],
};

const medicationQuestion: IntakeQuestion = {
  questionId: "q_medications",
  text: "지금 드시는 약이 있나요?",
  answerType: "FREE_TEXT",
  options: null,
};

const yesNoQuestion: IntakeQuestion = {
  questionId: "q_swelling",
  text: "아픈 곳이 부었나요?",
  answerType: "YES_NO_UNKNOWN",
  options: null,
};

function intake(overrides: Partial<IntakeResponse> = {}): IntakeResponse {
  return {
    intakeId: "intake-1",
    status: "IN_PROGRESS",
    stage: "BASIC_INFO",
    progress: { current: 1, total: 5 },
    collected: ["머리", "오늘"],
    question: ageQuestion,
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
      <TextInputQuestionsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  resetIntakeFlow();
});

describe("TextInputQuestionsPage", () => {
  it("시작한 문진이 없으면(새로고침·직접 진입) 질문을 그리지 않는다", () => {
    expect(renderPage()).not.toContain("연세가 어떻게 되세요?");
  });

  it.each([
    ["질문 없는 진행 중 응답", intake({ question: null })],
    [
      "응급 문진",
      intake({
        status: "EMERGENCY",
        question: null,
        progress: { current: 1, total: 5 },
      }),
    ],
    ["취소된 문진", intake({ status: "CANCELED", question: null })],
  ])("%s이면 그리지 않는다", (_name, start) => {
    beginIntakeSession(start);

    const markup = renderPage();

    expect(markup).not.toContain("몇 가지만 더 여쭤볼게요");
    expect(markup).not.toContain("정리했어요");
  });

  it("서버 응답 모양의 질문·진행·모은 정보를 그린다", () => {
    beginIntakeSession(intake());

    const markup = renderPage();

    expect(markup).toContain("질문 1 / 5");
    expect(markup).toContain("기본 정보");
    expect(markup).toContain("연세가 어떻게 되세요?");
    expect(markup).toContain("머리");
    expect(markup).toContain("오늘");
    expect(markup).toContain("50대 이하");
    expect(markup).toContain("80대 이상");
    expect(markup).toContain("← 이전 질문");
    expect(markup).not.toContain("다시 말씀해 주세요");
    expect(markup).not.toContain("<textarea");
  });

  it("FREE_TEXT 질문은 선택지 대신 글로 답하는 칸을 그린다", () => {
    beginIntakeSession(
      intake({
        progress: { current: 3, total: 5 },
        question: medicationQuestion,
      }),
    );

    const markup = renderPage();

    expect(markup).toContain("지금 드시는 약이 있나요?");
    expect(markup).toContain("<textarea");
    expect(markup).not.toContain('aria-pressed="');
  });

  it("reask가 true면 질문 종류와 상관없이 '다시 말씀해 주세요'를 보여 준다", () => {
    beginIntakeSession(intake({ reask: true }));
    expect(renderPage()).toContain("다시 말씀해 주세요");

    beginIntakeSession(intake({ reask: true, question: medicationQuestion }));
    expect(renderPage()).toContain("다시 말씀해 주세요");
  });

  it("마지막 질문이면 버튼 문구가 '답변 마치기'다", () => {
    beginIntakeSession(
      intake({
        progress: { current: 5, total: 5 },
        question: medicationQuestion,
      }),
    );

    expect(renderPage()).toContain("답변 마치기");
  });

  it("완료된 문진은 정리했어요와 병원 안내 링크를 보이고 이전 질문 버튼은 없다", () => {
    beginIntakeSession(
      intake({
        status: "COMPLETED",
        progress: { current: 5, total: 5 },
        question: null,
        department: {
          departmentCode: "05",
          departmentName: "정형외과",
          recommendReason: "무릎 통증이 있어 정형외과 진료를 권해요.",
        },
        summaryId: "summary-1",
      }),
    );

    const markup = renderPage();

    expect(markup).toContain("정리했어요");
    expect(markup).toContain("문진 완료");
    expect(markup).toContain('href="/location"');
    expect(markup).not.toContain("← 이전 질문");
  });
});

describe("IntakeAnswerChoices", () => {
  const render = (props: {
    question?: IntakeQuestion;
    reask?: boolean;
    busy?: boolean;
    initialCode?: string;
  }) =>
    renderToStaticMarkup(
      <IntakeAnswerChoices
        question={props.question ?? yesNoQuestion}
        reask={props.reask ?? false}
        last={false}
        busy={props.busy}
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

  it("고르기 전에는 다음 버튼이 잠겨 있고, 고른 뒤에는 열린다", () => {
    expect(render({})).toMatch(/<button[^>]*disabled=""[^>]*>다음 질문</);
    expect(render({ initialCode: "NO" })).not.toMatch(
      /<button[^>]*disabled=""[^>]*>다음 질문</,
    );
  });

  it("요청 중이면 선택지와 다음 버튼을 모두 잠근다", () => {
    const markup = render({ initialCode: "NO", busy: true });

    expect(markup.match(/disabled=""/g)).toHaveLength(4);
    expect(markup).toContain('aria-busy="true"');
  });

  it("요청 중이 아니면 선택지는 잠기지 않는다", () => {
    const markup = render({ initialCode: "NO" });

    expect(markup).not.toContain('aria-busy="true"');
    expect(markup.match(/disabled=""/g)).toBeNull();
  });
});

describe("IntakeAnswerText", () => {
  const render = (props: {
    reask?: boolean;
    busy?: boolean;
    initialText?: string;
    last?: boolean;
  }) =>
    renderToStaticMarkup(
      <IntakeAnswerText
        question={medicationQuestion}
        reask={props.reask ?? false}
        last={props.last ?? false}
        busy={props.busy}
        initialText={props.initialText}
        onSubmit={() => {}}
      />,
    );

  it("질문을 입력칸의 이름으로 읽히게 한다", () => {
    const markup = render({});

    expect(markup).toMatch(
      /<label[^>]*class="sr-only"[^>]*>지금 드시는 약이 있나요\?<\/label>/,
    );
    expect(markup).toContain("<textarea");
  });

  it("글이 비어 있으면 다음 버튼이 잠겨 있다", () => {
    expect(render({})).toMatch(/<button[^>]*disabled=""[^>]*>다음 질문</);
  });

  it("공백만 있어도 다음 버튼이 잠겨 있다", () => {
    expect(render({ initialText: "   " })).toMatch(
      /<button[^>]*disabled=""[^>]*>다음 질문</,
    );
  });

  it("이전 질문으로 돌아오면 직전에 쓴 글을 다시 보여 주고 다음 버튼이 열린다", () => {
    const markup = render({ initialText: "혈압약 하루 두 번" });

    expect(markup).toContain(">혈압약 하루 두 번</textarea>");
    expect(markup).not.toMatch(/<button[^>]*disabled=""[^>]*>다음 질문</);
  });

  it("요청 중이면 입력칸과 버튼(다음·없어요)을 잠근다", () => {
    const markup = render({ initialText: "혈압약", busy: true });

    expect(markup.match(/disabled=""/g)).toHaveLength(3);
    expect(markup).toContain('aria-busy="true"');
  });

  it("마지막 질문이면 '답변 마치기'를 보여 주고 reask면 안내를 보여 준다", () => {
    const markup = render({ last: true, reask: true });

    expect(markup).toContain("답변 마치기");
    expect(markup).toContain("다시 말씀해 주세요");
  });

  it("글자 수를 제한한다", () => {
    expect(render({})).toContain('maxLength="200"');
  });

  it("글이 비어 있으면 없어요 버튼이 열려 있다", () => {
    expect(render({})).not.toMatch(/<button[^>]*disabled=""[^>]*>없어요</);
    expect(render({})).toContain(">없어요<");
  });

  it("글이 있으면 없어요 버튼을 잠그고 글은 그대로 둔다", () => {
    const markup = render({ initialText: "혈압약" });

    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>없어요</);
    expect(markup).toContain(">혈압약</textarea>");
  });

  it("공백만 있으면 없어요 버튼이 열려 있다", () => {
    expect(render({ initialText: "   " })).not.toMatch(
      /<button[^>]*disabled=""[^>]*>없어요</,
    );
  });

  it("요청 중이면 없어요 버튼도 잠근다", () => {
    expect(render({ busy: true })).toMatch(
      /<button[^>]*disabled=""[^>]*>없어요</,
    );
  });

  it("없어요 답이 정해지지 않은 질문에는 버튼을 그리지 않는다", () => {
    const markup = renderToStaticMarkup(
      <IntakeAnswerText
        question={{ ...medicationQuestion, questionId: "q_other" }}
        reask={false}
        last={false}
        onSubmit={() => {}}
      />,
    );

    expect(markup).not.toContain(">없어요<");
  });
});
