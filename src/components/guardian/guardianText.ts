import type { Relation } from "@/api/enums";
import type { Guardian } from "@/api/guardians";
import { relationOptions } from "@/stores/guardianForm";

// 보호자 관계의 화면 문구입니다. E03 선택지(relationOptions)와 같은 것을 씁니다.
export const relationLabels = Object.fromEntries(
  relationOptions.map(({ value, label }) => [value, label]),
) as Record<Relation, string>;

// "딸 · 010-0000-0000". 전화번호는 서버가 준 모양(내 정보에서는 가운데를 가림) 그대로 씁니다.
export function formatGuardian(guardian: Guardian): string {
  return `${relationLabels[guardian.relation]} · ${guardian.phoneNumber}`;
}

// 보호자 연락처를 어디에, 얼마나 저장하는지입니다(#32, 10/30 백엔드 답변).
// P01 저장 동의 카드와 C01 "어디에, 얼마나 저장하나요?"가 같은 문구를 씁니다.
export const GUARDIAN_STORAGE_TEXT =
  "진료한장 서버 DB에 저장하고, 직접 지우거나 탈퇴할 때까지 보관해요";
