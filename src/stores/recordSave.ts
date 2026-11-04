import {
  getErrorMessage,
  getSavedMedicalRecordId,
  isApiError,
  isUnauthenticated,
} from "@/api/errors";
import { saveSummaryToRecords } from "@/api/records";
import { appActions } from "@/stores/appStore";
import { resetIntakeFlow } from "@/stores/intakeSession";
import type { SummarySession } from "@/stores/summarySession";

export type SaveSummaryOutcome =
  // 보관했습니다. alreadySaved는 이미 보관한 요약지라 서버가 기록 ID만 알려 준 경우입니다(SUMMARY_409). 기록 상세(H02)로 안내합니다.
  | { kind: "saved"; medicalRecordId: number; alreadySaved: boolean }
  // 기록 저장 동의가 없습니다(CONSENT_403). 동의(C02)로 안내합니다.
  | { kind: "needsConsent" }
  // 로그인이 풀렸습니다. 로그인(L01)으로 안내합니다.
  | { kind: "needsLogin" }
  // 요약지가 아직 만들어지는 중이거나 실패했습니다(SUMMARY_409). 만드는 중 화면(S06a)으로 안내합니다.
  | { kind: "notReady" }
  // 요약지가 없어졌거나 이 브라우저의 것이 아닙니다(SUMMARY_403, SUMMARY_404). 처음(S01)으로 안내합니다.
  | { kind: "gone" }
  | { kind: "failed"; message: string };

// 같은 요약지를 동시에 두 번 보관하려 하면(더블 클릭, StrictMode의 effect 두 번 실행) 요청은 한 번만 보냅니다.
const pending = new Map<string, Promise<SaveSummaryOutcome>>();
const savingListeners = new Set<() => void>();

function notifySaving() {
  savingListeners.forEach((listener) => listener());
}

// 보관 요청이 진행 중인지 화면이 구독해서 읽습니다(useSyncExternalStore).
// 버튼을 누른 경우와 로그인·동의 뒤 자동 보관 모두 같은 값으로 알 수 있습니다.
export function subscribeSaving(listener: () => void): () => void {
  savingListeners.add(listener);
  return () => {
    savingListeners.delete(listener);
  };
}

export function isSavingSummary(summaryId: string | undefined): boolean {
  return summaryId !== undefined && pending.has(summaryId);
}

// 서버는 보관하면 Redis의 문진·요약지를 바로 지웁니다(요약지가 DB 기록으로 옮겨집니다).
// 같은 summaryId로 다시 조회·확인·수정하면 SUMMARY_404라서 기억한 문진·요약지 ID도 함께 지우고,
// 화면은 기록 ID로 H02(기록 상세)에 보냅니다.
function markSaved() {
  appActions.markSummarySaved();
  resetIntakeFlow();
}

async function save(session: SummarySession): Promise<SaveSummaryOutcome> {
  try {
    const result = await saveSummaryToRecords(session.summaryId);
    markSaved();
    return {
      kind: "saved",
      medicalRecordId: result.medicalRecordId,
      alreadySaved: false,
    };
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (isUnauthenticated(error)) {
      appActions.markLoggedOut();
      return { kind: "needsLogin" };
    }
    if (error.code === "CONSENT_403") {
      appActions.revokeRecordConsent();
      return { kind: "needsConsent" };
    }
    if (error.code === "SUMMARY_409") {
      const medicalRecordId = getSavedMedicalRecordId(error);
      if (medicalRecordId === null) return { kind: "notReady" };
      markSaved();
      return { kind: "saved", medicalRecordId, alreadySaved: true };
    }
    if (error.code === "SUMMARY_403" || error.code === "SUMMARY_404") {
      // 서버에 없는 요약지라 기억한 문진과 요약지 ID를 지웁니다.
      resetIntakeFlow();
      return { kind: "gone" };
    }
    return { kind: "failed", message: getErrorMessage(error) };
  }
}

// 요약지를 내 기록에 보관합니다(S06). 로그인과 기록 저장 동의가 필요합니다.
// 성공하거나 이미 보관한 요약지라고 서버가 답한 경우에만 보관한 것으로 보여 줍니다.
export function saveCurrentSummary(
  session: SummarySession,
): Promise<SaveSummaryOutcome> {
  let request = pending.get(session.summaryId);
  if (!request) {
    request = save(session).finally(() => {
      pending.delete(session.summaryId);
      notifySaving();
    });
    pending.set(session.summaryId, request);
    notifySaving();
  }
  return request;
}
