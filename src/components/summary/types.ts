import type { AgeGroup, BodyPart, Gender, InputMode, Onset } from "@/api/enums";
import type { CollectedList } from "@/api/types";

// GET /api/summaries/{summaryId}의 result.summary 모양입니다.
// H02 기록 상세(GET /api/members/me/summaries/{medicalRecordId})도 같은 모양입니다.
export interface HealthInfo {
  name: string;
  detail: string | null;
}

// 증상마다 다른 항목입니다. 무릎 예시의 붓기·넘어진 적이 여기에 들어 있습니다.
export interface SummaryItem {
  order: number;
  label: string;
  question: string;
  value: string | null;
}

export interface SummaryDepartment {
  departmentCode: string;
  departmentName: string;
  recommendReason: string;
}

export interface SummaryContent {
  ageGroup: AgeGroup | null;
  gender: Gender | null;
  inputMode: InputMode;
  mainSymptom: string | null;
  bodyPart: BodyPart | null;
  onset: Onset | null;
  onsetDetail: string | null;
  extraNote: string | null;
  medications: CollectedList<HealthInfo>;
  conditions: CollectedList<HealthInfo>;
  allergies: CollectedList<HealthInfo>;
  items: SummaryItem[];
  department: SummaryDepartment | null;
  isConfirmed: boolean;
}
