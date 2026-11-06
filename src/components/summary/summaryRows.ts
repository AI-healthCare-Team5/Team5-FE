import type { AgeGroup, Gender } from "@/api/enums";
import type { HealthInfoItem, SummaryContent } from "@/api/summaries";
import {
  formatCollectedList,
  formatCollectedValue,
  UNCHECKED_TEXT,
} from "@/api/values";

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

// 응급 카드(E02)도 같은 모양의 건강 정보를 받아 이 문구로 보여 줍니다.
export function formatHealthInfo(value: SummaryContent["medications"]): string {
  return formatCollectedList(
    value &&
      value.map(({ name, detail }: HealthInfoItem) =>
        detail ? `${name} (${detail})` : name,
      ),
  );
}

// 하나만 없으면 그쪽만 "확인 못 했어요"로, 둘 다 없으면 한 번만 씁니다.
export function formatAgeGender(
  ageGroup: AgeGroup | null,
  gender: Gender | null,
): string {
  const age = ageGroup ? ageGroupLabels[ageGroup] : null;
  const sex = gender ? genderLabels[gender] : null;
  return age || sex
    ? `${age ?? UNCHECKED_TEXT} · ${sex ?? UNCHECKED_TEXT}`
    : UNCHECKED_TEXT;
}

// 요약지 항목 순서: 나이대·성별 / 주된 증상 / 언제부터 / 증상별 항목(order 순) / 추가 내용 / 복용약 / 앓는 병 / 알레르기 / 진료과
// 추가 내용은 선택 입력이라 "확인 못 했어요" 대신 값이 있을 때만 행을 만듭니다.
export function buildSummaryRows(summary: SummaryContent): SummaryRow[] {
  // 나이대·성별·진료과는 명세상 항상 있지만, 서버가 비워 보내도 화면이 깨지지 않게 "확인 못 했어요"로 보여 줍니다.
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
      value: formatAgeGender(summary.ageGroup, summary.gender),
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
    ...(summary.extraNote?.trim()
      ? [
          {
            key: "extraNote",
            label: "추가로 알려주신 내용",
            value: summary.extraNote,
          },
        ]
      : []),
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
