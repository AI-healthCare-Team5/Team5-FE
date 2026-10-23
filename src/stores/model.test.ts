import { describe, expect, it } from "vitest";
import { createSummary } from "@/stores/model";
import { interviewQuestions } from "@/stores/interviewQuestions";

describe("문진 화면 연결 규격", () => {
  it.each([{}, { symptom: "기침" }, { symptom: "무릎 통증" }])(
    "추천 결과가 없는 문진 %j에 진료과를 임의로 지정하지 않는다",
    (interview) => {
      expect(createSummary(interview).department).toBe(
        "아직 안내되지 않았어요",
      );
    },
  );
  it("확인하지 않은 건강 정보를 만들어 채우지 않는다", () => {
    const summary = createSummary({ symptom: "무릎 통증", age: "70대" });
    expect(summary.age).toBe("70대");
    expect(summary.symptom).toBe("무릎 통증");
    expect(summary.allergy).toBe("확인 못 했어요");
    expect(summary.medicine).toBe("확인 못 했어요");
  });
  it("7문항 응답이 요약지의 같은 항목에 반영된다", () => {
    const answers = Object.fromEntries(
      interviewQuestions.map((question) => [question.key, question.options[0]]),
    );
    const summary = createSummary(answers);
    interviewQuestions.forEach((question) =>
      expect(summary[question.key]).toBe(question.options[0]),
    );
  });
});
