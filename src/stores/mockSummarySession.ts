// VITE_API_MOCK=true일 때만 씁니다. 문진 화면(S04, S04a)을 연결하기 전까지 요약지 화면을 확인할 수 있게,
// 가짜 문진을 끝까지 진행해 요약지 세션을 만듭니다. 호출하는 쪽이 isMockApi일 때만 부르므로 프로덕션 번들에서는 빠집니다.
import { answerIntake, startIntake } from "@/api/intakes";
import {
  saveSummarySession,
  type SummarySession,
} from "@/stores/summarySession";

// 무한 반복을 막는 상한입니다. 가짜 문진은 질문이 7개를 넘지 않습니다.
const MAX_ANSWERS = 20;
// 예/아니요/모름 질문에는 이 순서로 답해서 요약지에 있음·없음·확인 못 함이 모두 나오게 합니다.
const YES_NO_ANSWERS = ["YES", "NO", "UNKNOWN"];

export async function startMockSummarySession(): Promise<SummarySession> {
  let intake = await startIntake({
    inputMode: "TEXT",
    text: "OO이 불편해요",
  });
  let yesNoCount = 0;

  for (let count = 0; count < MAX_ANSWERS && intake.question; count += 1) {
    const { questionId, options } = intake.question;
    const answer =
      options?.[0]?.code ??
      YES_NO_ANSWERS[yesNoCount++ % YES_NO_ANSWERS.length];
    const step = await answerIntake(intake.intakeId, {
      questionId,
      inputMode: "BUTTON",
      answer,
    });
    if (step.kind !== "advanced") break;
    intake = step.intake;
  }

  if (intake.status !== "COMPLETED" || !intake.summaryId) {
    throw new Error("가짜 문진을 끝내지 못했어요.");
  }
  const session = { intakeId: intake.intakeId, summaryId: intake.summaryId };
  saveSummarySession(session);
  return session;
}
