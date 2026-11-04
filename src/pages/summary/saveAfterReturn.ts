import type { SaveTarget } from "@/stores/loginIntent";
import type { SummarySession } from "@/stores/summarySession";

export interface SaveState {
  loggedIn: boolean;
  recordConsent: boolean;
  summarySaved: boolean;
  // "로그인하고 보관하기"나 "내 기록에 보관하기"를 누를 때 기억한 요약지입니다.
  saveTarget: SaveTarget | null;
}

// 로그인·동의를 마치고 S06으로 돌아왔을 때, 보관하려던 요약지를 이제 보관해야 하는지 알려 줍니다.
// 같은 요약지를 보관하러 나갔고(saveTarget), 로그인과 동의가 끝났고, 아직 보관하지 않았을 때만 true입니다.
export function isSavePending(
  state: SaveState,
  session: SummarySession,
): boolean {
  const { saveTarget } = state;
  return (
    state.loggedIn &&
    state.recordConsent &&
    !state.summarySaved &&
    saveTarget !== null &&
    saveTarget.intakeId === session.intakeId &&
    saveTarget.summaryId === session.summaryId
  );
}
