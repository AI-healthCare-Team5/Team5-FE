import type { SaveSummaryOutcome } from "@/stores/recordSave";

// 보관 결과에 따라 S06이 할 일입니다. 화면 밖에 두어서 React 없이 테스트합니다.
export type SaveOutcomeAction =
  // 다른 화면으로 보냅니다. replace는 지금 화면(S06)을 기록에 남기지 않는다는 뜻입니다.
  // resumeSave가 true이면 로그인·동의를 마친 뒤 이 요약지로 돌아와 보관을 이어 가도록 기억합니다.
  | { kind: "navigate"; to: string; replace: boolean; resumeSave: boolean }
  // 이 화면에서 안내합니다. 보관 버튼으로 다시 시도할 수 있습니다.
  | { kind: "message"; message: string };

export function actionForSaveOutcome(
  outcome: SaveSummaryOutcome,
): SaveOutcomeAction {
  switch (outcome.kind) {
    case "saved":
      // 서버는 보관하면 문진·요약지를 지웁니다. S06에 남으면 "내용이 맞아요"·"고칠 곳이 있어요"와 새로고침이
      // 모두 SUMMARY_404가 되어 안내 없이 처음으로 가므로, 보관한 기록(H02)으로 보냅니다.
      // 뒤로 가기로 지워진 요약지 화면에 돌아오지 않도록 지금 화면을 대체합니다.
      return {
        kind: "navigate",
        to: `/records/${encodeURIComponent(String(outcome.medicalRecordId))}`,
        replace: true,
        resumeSave: false,
      };
    case "needsConsent":
      return {
        kind: "navigate",
        to: "/record-consent",
        replace: false,
        resumeSave: true,
      };
    case "needsLogin":
      return {
        kind: "navigate",
        to: "/login",
        replace: false,
        resumeSave: true,
      };
    case "notReady":
      return {
        kind: "navigate",
        to: "/summary-loading",
        replace: true,
        resumeSave: false,
      };
    case "gone":
      return { kind: "navigate", to: "/", replace: true, resumeSave: false };
    case "failed":
      return { kind: "message", message: outcome.message };
  }
}
