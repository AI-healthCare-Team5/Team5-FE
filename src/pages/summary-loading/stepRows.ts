import {
  isEnumValue,
  summarySteps,
  summaryStepStatuses,
  type SummaryStep,
  type SummaryStepStatus,
} from "@/api/enums";
import type { SummaryStepState } from "@/api/summaries";

const stepLabels: Record<SummaryStep, string> = {
  BASIC_INFO: "나이대 · 성별 정리",
  SYMPTOM: "증상과 기간 정리",
  HEALTH_INFO: "복용약 · 병력 정리",
  DEPARTMENT: "진료과 확인",
};

const statusTexts: Record<SummaryStepStatus, string> = {
  WAITING: "대기",
  IN_PROGRESS: "하는 중",
  DONE: "완료",
};

export interface StepRow {
  step: SummaryStep;
  label: string;
  status: SummaryStepStatus;
  statusText: string;
}

// 서버가 알려 준 단계를 화면 순서(BASIC_INFO, SYMPTOM, HEALTH_INFO, DEPARTMENT)대로 놓습니다.
// 첫 응답 전이거나 응답에 없는 단계는 "대기"입니다.
export function buildStepRows(steps: SummaryStepState[] | null): StepRow[] {
  return summarySteps.map((step) => {
    const status = steps?.find((item) => item.step === step)?.status;
    const shown = isEnumValue(summaryStepStatuses, status) ? status : "WAITING";
    return {
      step,
      label: stepLabels[step],
      status: shown,
      statusText: statusTexts[shown],
    };
  });
}
