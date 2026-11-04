import type { SummaryContent } from "@/api/summaries";
import type { SavedRecord } from "@/stores/model";

// 화면 확인용 가짜 요약지입니다. 모두 지어낸 값이고, 서버 요약지와 같은 모양입니다.
// 가짜 응답(VITE_API_MOCK)의 예시 기록과 테스트에서만 씁니다.
export const sampleSummary: SummaryContent = {
  ageGroup: "SEVENTIES",
  gender: "FEMALE",
  inputMode: "VOICE",
  mainSymptom: "무릎 통증",
  bodyPart: "LEG_KNEE",
  onset: "DAYS_2_3",
  onsetDetail: "3일 전부터",
  extraNote: null,
  medications: [{ name: "혈압약", detail: "매일 아침" }],
  conditions: [{ name: "고혈압", detail: null }],
  allergies: [{ name: "약", detail: "페니실린" }],
  items: [
    { order: 1, label: "붓기", question: "무릎이 부었나요?", value: "있음" },
    {
      order: 2,
      label: "넘어진 적",
      question: "최근에 넘어지신 적이 있나요?",
      value: "없음",
    },
  ],
  department: {
    departmentCode: "05",
    departmentName: "정형외과",
    recommendReason:
      "무릎 통증이 사흘째이고 붓기가 있어 정형외과 진료를 권해요.",
  },
  isConfirmed: false,
};

const internalMedicine = {
  departmentCode: "01",
  departmentName: "내과",
  recommendReason: "불편하신 곳과 시작 시점을 바탕으로 내과 진료를 권해요.",
};

export function createSampleRecords(): SavedRecord[] {
  return [
    {
      id: "sample-knee",
      createdAt: "2026-10-16T00:00:00Z",
      summary: structuredClone(sampleSummary),
    },
    {
      // 건강 정보를 모두 "없음"([])으로 답한 기록입니다.
      id: "sample-cough",
      createdAt: "2026-09-28T00:00:00Z",
      summary: {
        ...structuredClone(sampleSummary),
        mainSymptom: "기침",
        bodyPart: "CHEST",
        onset: "OVER_WEEK",
        onsetDetail: "일주일 전부터",
        medications: [],
        conditions: [],
        allergies: [],
        items: [],
        department: { ...internalMedicine },
      },
    },
    {
      // 묻지 못한 항목(null)이 있는 기록입니다.
      id: "sample-dizziness",
      createdAt: "2026-09-03T00:00:00Z",
      summary: {
        ...structuredClone(sampleSummary),
        mainSymptom: "어지러움",
        bodyPart: "HEAD",
        onset: "DAYS_2_3",
        onsetDetail: "이틀 전부터",
        medications: null,
        conditions: null,
        allergies: [],
        items: [],
        department: { ...internalMedicine },
      },
    },
  ];
}
