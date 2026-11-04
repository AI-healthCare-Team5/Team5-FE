import { apiRequest, isMockApi } from "@/api/client";
import type { ConsentType } from "@/api/enums";
import * as mock from "@/api/mockApi";
import type { IsoDateTime } from "@/api/types";

// 동의 문구의 버전입니다. 서버 설정의 현재 버전(app.consent.version)과 같아야 하고, 다르면 400입니다.
// 동의 문구 자체는 프론트 상수이고, 문구를 조회하거나 동의를 철회하는 API는 없습니다.
// 문구를 바꾸면 서버 설정과 함께 올립니다.
export const RECORD_POLICY_VERSION = "v1";
export const GUARDIAN_POLICY_VERSION = "v1";

export interface ConsentResult {
  consentId: number;
  consentType: ConsentType;
  policyVersion: string;
  agreedAt: IsoDateTime;
}

// 기록 저장 동의(C02)입니다. 로그인이 필요합니다.
// 새로 동의하면 CONSENT_201, 이미 같은 버전에 동의해 있으면 CONSENT_200으로 둘 다 성공입니다.
// 보호자 연락처 저장 동의(GUARDIAN)는 이 API가 아니라 보호자 등록(PUT /members/me/guardian)과 함께 저장합니다.
export async function agreeToRecordConsent(
  signal?: AbortSignal,
): Promise<ConsentResult> {
  const request = {
    consentType: "RECORD",
    policyVersion: RECORD_POLICY_VERSION,
  } as const;
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.agreeToRecordConsent(request);
  }
  return apiRequest<ConsentResult>("/consents", {
    method: "POST",
    body: request,
    signal,
  });
}
