import { apiRequest, isMockApi } from "@/api/client";
import type { Relation } from "@/api/enums";
import { GUARDIAN_POLICY_VERSION } from "@/api/consents";
import * as mock from "@/api/mockApi";

// 내 정보(GET /members/me)와 응급 카드(GET /intakes/{intakeId}/emergency-card)의 guardian 모양입니다.
// 보호자가 없으면 guardian은 null입니다. 이름은 받지 않고 관계만 받습니다.
// 전화번호는 하이픈을 포함하고, 내 정보에서는 가운데를 가립니다(예: 010-****-5678).
// 응급 카드는 로그인했고 등록된 경우에만 전체 번호를 주고, 아니면 null입니다.
export interface Guardian {
  relation: Relation;
  phoneNumber: string;
}

export interface GuardianInput {
  relation: Relation;
  // 하이픈이 있어도 보낼 때 숫자만 남깁니다. 서버는 숫자 10~11자리만 받습니다.
  phoneNumber: string;
  // 보호자 연락처 저장 동의(C01)에 체크했는지입니다. true가 아니면 서버가 GUARDIAN_400(field consentAgreed)입니다.
  consentAgreed: boolean;
}

// 보호자 등록·변경 요청 본문입니다. 보호자와 GUARDIAN 동의를 한 요청에 담습니다.
export interface GuardianRequest {
  relation: Relation;
  phoneNumber: string;
  consentAgreed: boolean;
  policyVersion: string;
}

export interface GuardianResult extends Guardian {
  guardianId: number;
}

export function buildGuardianRequest(input: GuardianInput): GuardianRequest {
  return {
    relation: input.relation,
    phoneNumber: input.phoneNumber.replace(/\D/g, ""),
    consentAgreed: input.consentAgreed,
    policyVersion: GUARDIAN_POLICY_VERSION,
  };
}

// 보호자를 등록하거나 바꿉니다(E03). 회원당 보호자는 1명이라 항상 덮어씁니다. 로그인이 필요합니다.
// 400은 result.errors의 field(relation, phoneNumber, consentAgreed, policyVersion)로 칸을 가립니다.
export async function saveGuardian(
  input: GuardianInput,
  signal?: AbortSignal,
): Promise<GuardianResult> {
  const request = buildGuardianRequest(input);
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.saveGuardian(request);
  }
  return apiRequest<GuardianResult>("/members/me/guardian", {
    method: "PUT",
    body: request,
    signal,
  });
}

// 보호자를 지웁니다(P01, E02). 서버가 보호자 연락처 저장 동의(GUARDIAN)도 함께 철회합니다.
// 등록된 보호자가 없으면 GUARDIAN_404입니다. 로그인이 필요합니다.
export async function deleteGuardian(signal?: AbortSignal): Promise<void> {
  if (isMockApi) {
    signal?.throwIfAborted();
    mock.deleteGuardian();
    return;
  }
  await apiRequest<null>("/members/me/guardian", {
    method: "DELETE",
    signal,
  });
}
