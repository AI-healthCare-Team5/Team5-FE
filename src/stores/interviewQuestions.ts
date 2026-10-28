import type { QuestionKey } from "@/stores/model";

export interface InterviewQuestion {
  key: QuestionKey;
  group: "기본 정보" | "증상 확인" | "복용약·병력" | "알레르기";
  title: string;
  options: readonly string[];
  description?: string;
}

export const interviewQuestions: readonly InterviewQuestion[] = [
  {
    key: "age",
    group: "기본 정보",
    title: "연세가 어떻게 되세요?",
    options: ["50대 이하", "60대", "70대", "80대 이상"],
  },
  {
    key: "gender",
    group: "기본 정보",
    title: "성별을 알려 주세요",
    options: ["남성", "여성"],
  },
  {
    key: "swelling",
    group: "증상 확인",
    title: "아픈 곳이 부었나요?",
    options: ["네", "아니요", "잘 모르겠어요"],
  },
  {
    key: "fall",
    group: "증상 확인",
    title: "최근에 넘어지신 적이 있나요?",
    options: ["네", "아니요", "잘 모르겠어요"],
  },
  {
    key: "medicine",
    group: "복용약·병력",
    title: "매일 드시는 약이 있나요?",
    options: ["혈압약", "당뇨약", "먹는 약 없음", "다른 약이에요"],
  },
  {
    key: "conditions",
    group: "복용약·병력",
    title: "앓고 계신 병이 있나요?",
    options: ["고혈압", "당뇨", "없어요", "다른 병이에요"],
  },
  {
    key: "allergy",
    group: "알레르기",
    title: "먹고 몸에 이상이 생긴 약이나 음식이 있나요?",
    description: "두드러기, 숨참 같은 반응이 있었다면 알려 주세요.",
    options: ["약", "음식", "없어요", "잘 모르겠어요"],
  },
];
