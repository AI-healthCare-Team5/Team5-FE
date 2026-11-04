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
