import type {
  IntakeOption,
  IntakeQuestion,
  IntakeView,
} from "@/stores/intakeFlow";
import {
  bodyPartOptions,
  onsetOptions,
  type IntakeStartRequest,
} from "@/stores/intakeStart";
import type { QuestionKey } from "@/stores/model";

// 문진 API(#26)를 연결하기 전까지 S04a가 쓰는 가짜 서버입니다.
// 질문 문구·answerType·선택지는 #26의 mock(서버 Swagger 기준)과 같습니다.
// BUTTON으로 시작하면 증상 질문 없이 바로 BASIC_INFO 5문항을 묻습니다(노션 POST /api/intakes 설명).
interface SampleQuestion extends IntakeQuestion {
  // 모은 정보(collected)에 쓰는 이름입니다.
  label: string;
  // 요약지 모델을 바꾸기 전(#26)까지 기존 요약지 칸에도 답을 남깁니다.
  interviewKey: QuestionKey;
}

const sampleQuestions: SampleQuestion[] = [
  {
    questionId: "q_age_group",
    text: "연세가 어떻게 되세요?",
    answerType: "SINGLE_CHOICE",
    options: [
      { code: "UNDER_50", label: "50세 미만" },
      { code: "SIXTIES", label: "60대" },
      { code: "SEVENTIES", label: "70대" },
      { code: "OVER_80", label: "80세 이상" },
    ],
    label: "나이대",
    interviewKey: "age",
  },
  {
    questionId: "q_gender",
    text: "성별을 알려 주세요.",
    answerType: "SINGLE_CHOICE",
    options: [
      { code: "MALE", label: "남성" },
      { code: "FEMALE", label: "여성" },
    ],
    label: "성별",
    interviewKey: "gender",
  },
  {
    questionId: "q_medications",
    text: "지금 드시는 약이 있나요?",
    answerType: "YES_NO_UNKNOWN",
    options: null,
    label: "복용약",
    interviewKey: "medicine",
  },
  {
    questionId: "q_conditions",
    text: "앓고 계신 병이 있나요?",
    answerType: "YES_NO_UNKNOWN",
    options: null,
    label: "앓는 병",
    interviewKey: "conditions",
  },
  {
    questionId: "q_allergies",
    text: "먹거나 바르고 나서 이상이 생긴 약이나 음식이 있나요?",
    answerType: "YES_NO_UNKNOWN",
    options: null,
    label: "알레르기",
    interviewKey: "allergy",
  },
];

export interface SampleAnswer {
  questionId: string;
  code: string;
  label: string;
}

function toQuestion({
  questionId,
  text,
  answerType,
  options,
}: SampleQuestion): IntakeQuestion {
  return { questionId, text, answerType, options };
}

function startLabels(start: IntakeStartRequest): string[] {
  const bodyPart = bodyPartOptions.find(
    (option) => option.value === start.bodyPart,
  );
  const onset = onsetOptions.find((option) => option.value === start.onset);
  return [bodyPart?.label, onset?.label].filter(
    (label): label is string => label !== undefined,
  );
}

// 시작 요청과 지금까지의 답으로 서버 응답 모양을 만듭니다.
export function createSampleIntakeView(
  start: IntakeStartRequest,
  answers: SampleAnswer[],
): IntakeView {
  const total = sampleQuestions.length;
  const collected = [
    ...startLabels(start),
    ...answers.map((answer, index) => {
      return `${sampleQuestions[index].label}: ${answer.label}`;
    }),
  ];
  const current = sampleQuestions[answers.length];
  if (!current) {
    return {
      status: "COMPLETED",
      stage: "BASIC_INFO",
      progress: { current: total, total },
      collected,
      question: null,
      reask: false,
    };
  }
  return {
    status: "IN_PROGRESS",
    stage: "BASIC_INFO",
    progress: { current: answers.length + 1, total },
    collected,
    question: toQuestion(current),
    reask: false,
  };
}

// 지금 질문에 대한 답을 더합니다. 지금 질문이 아니면(중복 전송) 그대로 둡니다.
export function addSampleAnswer(
  answers: SampleAnswer[],
  questionId: string,
  choice: IntakeOption,
): SampleAnswer[] {
  if (sampleQuestions[answers.length]?.questionId !== questionId) {
    return answers;
  }
  return [...answers, { questionId, code: choice.code, label: choice.label }];
}

// 기존 요약지 칸(model.ts의 Interview)에 남길 key입니다.
export function sampleInterviewKey(questionId: string): QuestionKey | null {
  return (
    sampleQuestions.find((question) => question.questionId === questionId)
      ?.interviewKey ?? null
  );
}
