import { describe, expect, it } from "vitest";
import { answerChoices } from "@/stores/intakeFlow";
import type { IntakeStartRequest } from "@/stores/intakeStart";
import {
  addSampleAnswer,
  createSampleIntakeView,
  sampleInterviewKey,
  type SampleAnswer,
} from "@/stores/sampleIntake";

const start: IntakeStartRequest = {
  inputMode: "BUTTON",
  bodyPart: "LEG_KNEE",
  onset: "DAYS_2_3",
};

// 각 질문의 첫 번째 선택지로 끝까지 답합니다.
function answerAll(): SampleAnswer[] {
  let answers: SampleAnswer[] = [];
  for (;;) {
    const { question } = createSampleIntakeView(start, answers);
    if (!question) return answers;
    answers = addSampleAnswer(
      answers,
      question.questionId,
      answerChoices(question)[0],
    );
  }
}

describe("createSampleIntakeView", () => {
  it("버튼으로 시작하면 BASIC_INFO 첫 질문과 S04 선택을 모은 정보로 준다", () => {
    const view = createSampleIntakeView(start, []);

    expect(view.status).toBe("IN_PROGRESS");
    expect(view.stage).toBe("BASIC_INFO");
    expect(view.progress).toEqual({ current: 1, total: 5 });
    expect(view.collected).toEqual(["다리 · 무릎", "2~3일"]);
    expect(view.question).toEqual({
      questionId: "q_age_group",
      text: "연세가 어떻게 되세요?",
      answerType: "SINGLE_CHOICE",
      options: [
        { code: "UNDER_50", label: "50세 미만" },
        { code: "SIXTIES", label: "60대" },
        { code: "SEVENTIES", label: "70대" },
        { code: "OVER_80", label: "80세 이상" },
      ],
    });
    expect(view.reask).toBe(false);
  });

  it("답하면 진행이 늘고 모은 정보에 '항목: 답'이 쌓인다", () => {
    const answers = addSampleAnswer([], "q_age_group", {
      code: "SEVENTIES",
      label: "70대",
    });
    const view = createSampleIntakeView(start, answers);

    expect(answers).toEqual([
      { questionId: "q_age_group", code: "SEVENTIES", label: "70대" },
    ]);
    expect(view.progress).toEqual({ current: 2, total: 5 });
    expect(view.collected.at(-1)).toBe("나이대: 70대");
    expect(view.question?.questionId).toBe("q_gender");
  });

  it("같은 답이 여러 질문에 나와도 모은 정보에서 질문을 구분할 수 있다", () => {
    const view = createSampleIntakeView(start, answerAll());

    expect(view.collected).toEqual([
      "다리 · 무릎",
      "2~3일",
      "나이대: 50세 미만",
      "성별: 남성",
      "복용약: 네",
      "앓는 병: 네",
      "알레르기: 네",
    ]);
  });

  it("다섯 문항에 모두 답하면 질문 없이 COMPLETED를 준다", () => {
    const answers = answerAll();
    const view = createSampleIntakeView(start, answers);

    expect(answers).toHaveLength(view.progress.total);
    expect(view.status).toBe("COMPLETED");
    expect(view.question).toBeNull();
    expect(view.progress).toEqual({ current: 5, total: 5 });
  });

  it("복용약·앓는 병·알레르기는 options 없이 YES_NO_UNKNOWN으로 묻는다", () => {
    let answers: SampleAnswer[] = [];
    const types: string[] = [];
    for (;;) {
      const { question } = createSampleIntakeView(start, answers);
      if (!question) break;
      types.push(`${question.questionId}:${question.answerType}`);
      if (question.answerType === "YES_NO_UNKNOWN") {
        expect(question.options).toBeNull();
      }
      answers = addSampleAnswer(
        answers,
        question.questionId,
        answerChoices(question)[0],
      );
    }

    expect(types).toEqual([
      "q_age_group:SINGLE_CHOICE",
      "q_gender:SINGLE_CHOICE",
      "q_medications:YES_NO_UNKNOWN",
      "q_conditions:YES_NO_UNKNOWN",
      "q_allergies:YES_NO_UNKNOWN",
    ]);
  });
});

describe("addSampleAnswer", () => {
  it("지금 질문이 아닌 답(중복 전송)은 무시한다", () => {
    const once = addSampleAnswer([], "q_age_group", {
      code: "SIXTIES",
      label: "60대",
    });

    expect(
      addSampleAnswer(once, "q_age_group", { code: "SIXTIES", label: "60대" }),
    ).toBe(once);
    expect(answerAll()).toHaveLength(5);
    expect(
      addSampleAnswer(answerAll(), "q_allergies", {
        code: "NO",
        label: "아니요",
      }),
    ).toHaveLength(5);
  });
});

describe("sampleInterviewKey", () => {
  it("기존 요약지 칸의 key를 돌려주고, 모르는 질문이면 null이다", () => {
    expect(sampleInterviewKey("q_medications")).toBe("medicine");
    expect(sampleInterviewKey("q_unknown")).toBeNull();
  });
});
