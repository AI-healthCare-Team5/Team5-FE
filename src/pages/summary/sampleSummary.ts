import type { SummaryContent } from "@/components/summary/types";

// 요약지 조회 API(#26)를 연결하기 전 화면 검토용 가짜 데이터입니다. 노션 명세의 응답 예시와 같은 모양입니다.
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
    {
      order: 1,
      label: "붓기",
      question: "무릎이 부었나요?",
      value: "있음",
    },
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

export const sampleSummaryCreatedAt = "2026-10-30T14:20:00+09:00";
