import type { CollectedList } from "@/api/types";

export const UNCHECKED_TEXT = "확인 못 했어요";
export const NONE_TEXT = "없음";

// null은 "확인 못 했어요", []는 "없음", 값이 있으면 쉼표로 이어 보여 줍니다.
export function formatCollectedList(value: CollectedList<string>): string {
  if (value === null) return UNCHECKED_TEXT;
  if (value.length === 0) return NONE_TEXT;
  return value.join(", ");
}

// 값이 null인 단일 항목은 "확인 못 했어요"로 보여 줍니다.
export function formatCollectedValue(value: string | null): string {
  return value === null || value.trim() === "" ? UNCHECKED_TEXT : value;
}
