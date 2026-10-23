import type { SavedRecord, SummaryData } from "@/stores/model";

export const sampleSummary: SummaryData = {
  age: "70대",
  gender: "여성",
  symptom: "무릎 통증",
  duration: "3일 전부터",
  swelling: "있음",
  fall: "없음",
  medicine: "혈압약 (매일 아침)",
  conditions: "고혈압",
  allergy: "약 (페니실린)",
  department: "정형외과",
};

export function createSampleRecords(): SavedRecord[] {
  return [
    {
      id: "sample-knee",
      createdAt: "2026-10-16T00:00:00Z",
      summary: { ...sampleSummary },
    },
    {
      id: "sample-cough",
      createdAt: "2026-09-28T00:00:00Z",
      summary: {
        ...sampleSummary,
        symptom: "기침",
        duration: "일주일 전부터",
        department: "내과",
      },
    },
    {
      id: "sample-dizziness",
      createdAt: "2026-09-03T00:00:00Z",
      summary: {
        ...sampleSummary,
        symptom: "어지러움",
        duration: "이틀 전부터",
        department: "내과",
      },
    },
  ];
}
