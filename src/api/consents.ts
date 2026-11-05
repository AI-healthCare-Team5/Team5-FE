import { apiRequest, isMockApi } from "@/api/client";
import type { ConsentType } from "@/api/enums";
import * as mock from "@/api/mockApi";
import type { IsoDateTime } from "@/api/types";

// 동의 문구의 버전입니다. 서버 설정의 현재 버전(app.consent.version)과 같아야 하고, 다르면 400입니다.
// 동의 문구 자체는 프론트 상수이고, 문구를 조회하거나 동의를 철회하는 API는 없습니다.
// 문구를 바꾸면 서버 설정과 함께 올립니다.
//
// `v1`의 근거: 백엔드 develop 브랜치 061842f의 application.yml 20~23행(app.consent.version.record·guardian: v1)입니다.
// https://github.com/AI-healthCare-Team5/Team5-BE/blob/061842ff0552b50594c93aa3323d53a8e8470bfd/src/main/resources/application.yml#L20-L23
// `CONSENT_400`(현재 버전이 아닌 policyVersion)은 같은 커밋의 ConsentController.java 38행에 있습니다(컨트롤러는 아직 NOT_IMPLEMENTED).
// 백엔드 main(1314d83)의 application.yml에는 이 설정이 없습니다.
//
// 아직 확인하지 못한 것(이 값으로 판단하지 않습니다):
// - 이 설정으로 백엔드가 배포되어 사용자가 실제로 동의했는지, 기존 동의가 쌓여 있는지. 확인할 근거가 저장소에 없습니다.
//   백엔드의 dev 배포 워크플로(deploy-dev.yml)는 비활성이라고 적혀 있습니다.
// - 동의 문구가 바뀔 때 버전을 올리는 기준(첫 배포 전에는 v1을 유지할지, 문구가 바뀌면 올릴지).
//   위 둘이 정해지기 전까지 프론트와 백엔드가 같은 `v1`을 쓴다는 사실만 기록합니다.
export const RECORD_POLICY_VERSION = "v1";
// 보호자 연락처 저장 동의(GUARDIAN)도 위와 같은 근거와 같은 미확인 사항을 가집니다.
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
