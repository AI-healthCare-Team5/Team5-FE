import type { InputMode } from "@/api/enums";
import type { IntakeResponse } from "@/api/intakes";
import { clearSummarySession } from "@/stores/summarySession";

// 문진을 진행하는 동안(S04 → S04a → S05) 서버가 알려 준 문진 상태를 기억합니다.
// 증상과 답변은 진료 정보라 sessionStorage에 넣지 않고 메모리에만 둡니다.
// 새로고침하면 사라지고, 화면은 앞 화면으로 돌아가 다시 시작합니다.
// 요약지 화면(S06a, S06)이 쓰는 문진·요약지 ID는 summarySession.ts가 따로 기억합니다.

// 사용자가 한 답입니다. 이전 질문으로 돌아왔을 때 다시 보여 주는 데 씁니다.
export interface SubmittedAnswer {
  inputMode: InputMode;
  answer: string;
}

export interface IntakeSession {
  // 서버가 마지막으로 알려 준 문진 상태입니다. COMPLETED면 department와 summaryId가 있습니다.
  intake: IntakeResponse;
  // 질문마다 마지막으로 한 답입니다. 키는 questionId입니다.
  answers: Record<string, SubmittedAnswer>;
}

let current: IntakeSession | null = null;

// 새 문진을 시작했을 때 부릅니다. 이전 문진의 답은 지우고, 이전 요약지 ID도 지웁니다.
// 요약지 ID는 이 문진이 COMPLETED가 되면 새로 기억하므로, 그 전에는 이전 요약지가 보이지 않게 합니다.
export function beginIntakeSession(intake: IntakeResponse) {
  clearSummarySession();
  current = { intake, answers: {} };
}

// 기억한 문진을 읽습니다. 없으면 null입니다. 돌려준 값을 바꿔도 기억한 값에는 영향이 없습니다.
export function readIntakeSession(): IntakeSession | null {
  return current ? structuredClone(current) : null;
}

// 서버가 알려 준 새 상태로 바꿉니다. 기억한 문진이 아닌 다른 문진의 응답은 무시합니다.
export function updateIntakeSession(intake: IntakeResponse) {
  if (!current || current.intake.intakeId !== intake.intakeId) return;
  current = { ...current, intake };
}

export function rememberAnswer(
  intakeId: string,
  questionId: string,
  answer: SubmittedAnswer,
) {
  if (!current || current.intake.intakeId !== intakeId) return;
  current = {
    ...current,
    answers: { ...current.answers, [questionId]: answer },
  };
}

// 문진을 취소했거나 서버에서 찾을 수 없다고 할 때, 그리고 흐름을 처음부터 다시 시작할 때 지웁니다.
export function clearIntakeSession() {
  current = null;
}

// 문진·진료과·병원·요약지 흐름이 기억한 것을 모두 지웁니다. 흐름을 처음부터 다시 시작하는 곳에서 부릅니다.
export function resetIntakeFlow() {
  clearIntakeSession();
  clearSummarySession();
}
