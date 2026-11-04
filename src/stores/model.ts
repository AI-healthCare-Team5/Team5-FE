import { UNCHECKED_TEXT } from "@/api/values";

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

export interface SummaryData {
  age: string;
  gender: string;
  symptom: string;
  duration: string;
  swelling: string;
  fall: string;
  medicine: string;
  conditions: string;
  allergy: string;
  department: string;
}

export interface SavedRecord {
  id: string;
  createdAt: string;
  summary: SummaryData;
}

export function createSummary(interview: Interview): SummaryData {
  const unknown = UNCHECKED_TEXT;
  return {
    age: interview.age ?? unknown,
    gender: interview.gender ?? unknown,
    symptom: interview.symptom ?? unknown,
    duration: interview.duration ?? unknown,
    swelling: interview.swelling ?? unknown,
    fall: interview.fall ?? unknown,
    medicine: interview.medicine ?? unknown,
    conditions: interview.conditions ?? unknown,
    allergy: interview.allergy ?? unknown,
    department: "아직 안내되지 않았어요",
  };
}
