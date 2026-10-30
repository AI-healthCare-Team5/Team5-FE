import type { AgeGroup, Gender } from "@/api/enums";
import {
  formatCollectedList,
  formatCollectedValue,
  UNCHECKED_TEXT,
} from "@/api/values";
import type { HealthInfo, SummaryContent } from "@/components/summary/types";

export interface SummaryRow {
  key: string;
  label: string;
  value: string;
}

const ageGroupLabels: Record<AgeGroup, string> = {
  UNDER_50: "50대 이하",
  SIXTIES: "60대",
  SEVENTIES: "70대",
  OVER_80: "80대 이상",
};

const genderLabels: Record<Gender, string> = {
  MALE: "남성",
  FEMALE: "여성",
};

function formatHealthInfo(value: SummaryContent["medications"]): string {
  return formatCollectedList(
    value &&
      value.map(({ name, detail }: HealthInfo) =>
        detail ? `${name} (${detail})` : name,
      ),
  );
}

// 요약지 항목 순서: 나이대·성별 / 주된 증상 / 언제부터 / 증상별 항목(order 순) / 복용약 / 앓는 병 / 알레르기 / 진료과
export function buildSummaryRows(summary: SummaryContent): SummaryRow[] {
  const ageGroup = summary.ageGroup ? ageGroupLabels[summary.ageGroup] : null;
  const gender = summary.gender ? genderLabels[summary.gender] : null;
  const items = [...summary.items]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      key: `item-${item.order}`,
      label: item.label,
      value: formatCollectedValue(item.value),
    }));
  return [
    {
      key: "ageGender",
      label: "나이대 · 성별",
      value:
        ageGroup || gender
          ? `${ageGroup ?? UNCHECKED_TEXT} · ${gender ?? UNCHECKED_TEXT}`
          : UNCHECKED_TEXT,
    },
    {
      key: "mainSymptom",
      label: "주된 증상",
      value: formatCollectedValue(summary.mainSymptom),
    },
    {
      key: "onset",
      label: "언제부터",
      value: formatCollectedValue(summary.onsetDetail),
    },
    ...items,
    {
      key: "medications",
      label: "복용 중인 약",
      value: formatHealthInfo(summary.medications),
    },
    {
      key: "conditions",
      label: "앓고 있는 병",
      value: formatHealthInfo(summary.conditions),
    },
    {
      key: "allergies",
      label: "알레르기",
      value: formatHealthInfo(summary.allergies),
    },
    {
      key: "department",
      label: "안내된 진료과",
      value: formatCollectedValue(summary.department?.departmentName ?? null),
    },
  ];
}
