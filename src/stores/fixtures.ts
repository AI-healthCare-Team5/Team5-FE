import type { SummaryContent } from "@/api/summaries";

// 화면 확인용 가짜 요약지입니다. 모두 지어낸 값이고, 서버 요약지와 같은 모양입니다.
// 테스트에서만 씁니다. 가짜 응답(VITE_API_MOCK)의 예시 기록은 mockApi.ts에 있습니다.
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
