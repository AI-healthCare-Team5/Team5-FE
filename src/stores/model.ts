import type { SummaryContent } from "@/api/summaries";

export const questionKeys = [
  "age",
  "gender",
  "swelling",
  "fall",
  "medicine",
  "conditions",
  "allergy",
] as const;
export type QuestionKey = (typeof questionKeys)[number];
export type Interview = Partial<
  Record<QuestionKey | "symptom" | "duration" | "detail", string>
>;

export interface SavedRecord {
  id: string;
  createdAt: string;
  // 서버 요약지와 같은 모양입니다. null은 "확인 못 했어요", []는 "없음"입니다.
  summary: SummaryContent;
}
