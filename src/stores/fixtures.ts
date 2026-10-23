import type { SavedRecord, SummaryData } from "@/stores/model";

export const sampleSummary: SummaryData = {
  age: "70대",
  gender: "남성",
  symptom: "무릎 통증",
  duration: "사흘째",
  swelling: "조금 부었어요",
  fall: "없음",
  medicine: "혈압약 (이름 모름)",
  conditions: "고혈압",
  allergy: "확인 못 했어요",
  department: "정형외과",
};

export function createSampleRecords(): SavedRecord[] {
  return [
    {
      id: "sample-knee",
      createdAt: "2026-10-23T00:00:00Z",
      summary: { ...sampleSummary },
    },
    {
      id: "sample-cough",
      createdAt: "2026-10-20T00:00:00Z",
      summary: {
        ...sampleSummary,
        symptom: "기침",
        duration: "이틀째",
        department: "내과",
      },
    },
    {
      id: "sample-back",
      createdAt: "2026-10-16T00:00:00Z",
      summary: { ...sampleSummary, symptom: "허리 통증", duration: "일주일째" },
    },
  ];
}
