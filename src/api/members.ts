import { apiRequest, isMockApi } from "@/api/client";
import type { Guardian } from "@/api/guardians";
import * as mock from "@/api/mockApi";
import type { IsoDateTime } from "@/api/types";

export interface ConsentStatus {
  // 지금 동의해 있는지입니다.
  agreed: boolean;
  // 동의하지 않았으면 null입니다.
  policyVersion: string | null;
  agreedAt: IsoDateTime | null;
}

export interface MemberInfo {
  memberId: number;
  // 닉네임 제공은 선택 동의라 null일 수 있어요.
  nickname: string | null;
  provider: string;
  consents: {
    // 기록 저장 동의입니다.
    record: ConsentStatus;
    // 보호자 연락처 저장 동의입니다.
    guardian: ConsentStatus;
  };
  // 보관한 기록 수입니다.
  recordCount: number;
  // 보호자가 없으면 null입니다. 전화번호는 가운데를 가립니다.
  guardian: Guardian | null;
}

// 내 정보(P01)를 조회합니다. 로그인하지 않았으면 AUTH_401입니다.
// 새로고침한 뒤 로그인 상태가 남아 있는지 확인하는 데도 씁니다.
export async function getMyInfo(signal?: AbortSignal): Promise<MemberInfo> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.getMyInfo();
  }
  return apiRequest<MemberInfo>("/members/me", { signal });
}

// 회원을 탈퇴합니다(P01). 기록과 보호자를 지우고 동의를 모두 철회하며 쿠키도 지웁니다.
// 같은 카카오 계정으로 30일 안에 다시 와도 기록은 복구되지 않습니다.
export async function withdrawMember(signal?: AbortSignal): Promise<void> {
  if (isMockApi) {
    signal?.throwIfAborted();
    mock.withdrawMember();
    return;
  }
  await apiRequest<null>("/members/me", { method: "DELETE", signal });
}
