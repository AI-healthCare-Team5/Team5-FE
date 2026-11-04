import { agreeToRecordConsent } from "@/api/consents";
import { getErrorMessage, isApiError, isUnauthenticated } from "@/api/errors";
import { appActions } from "@/stores/appStore";

export type RecordConsentOutcome =
  | { kind: "agreed" }
  // 로그인이 풀렸습니다. 로그인(L01)으로 안내합니다.
  | { kind: "needsLogin" }
  | { kind: "failed"; message: string };

// 버튼을 두 번 눌러도 동의 요청은 한 번만 보냅니다.
let pending: Promise<RecordConsentOutcome> | null = null;

async function submit(): Promise<RecordConsentOutcome> {
  try {
    await agreeToRecordConsent();
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (isUnauthenticated(error)) {
      appActions.markLoggedOut();
      return { kind: "needsLogin" };
    }
    return { kind: "failed", message: getErrorMessage(error) };
  }
  // 서버가 동의를 받은 뒤에만 동의한 것으로 보여 줍니다.
  appActions.agreeToRecords();
  return { kind: "agreed" };
}

// 기록 저장 동의(C02)를 서버에 보냅니다. 이미 같은 버전에 동의해 있어도 성공입니다.
export function submitRecordConsent(): Promise<RecordConsentOutcome> {
  pending ??= submit().finally(() => {
    pending = null;
  });
  return pending;
}
