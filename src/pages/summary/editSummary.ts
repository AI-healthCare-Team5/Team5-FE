import type { SummaryContent } from "@/components/summary/types";

export interface SummaryEdits {
  mainSymptom: string;
  onsetDetail: string;
  // 증상별 항목의 값입니다. 키는 항목의 order입니다.
  itemValues: Record<number, string>;
}

export const editMaxLength = 100;

// 비운 칸은 null("확인 못 했어요")로 바꿉니다. 주된 증상은 비울 수 없습니다.
export function canSaveEdits(edits: SummaryEdits): boolean {
  return edits.mainSymptom.trim() !== "";
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// 고치면 사용자가 다시 확인해야 하므로 isConfirmed를 false로 되돌립니다.
export function applySummaryEdits(
  summary: SummaryContent,
  edits: SummaryEdits,
): SummaryContent {
  return {
    ...summary,
    mainSymptom: edits.mainSymptom.trim(),
    onsetDetail: blankToNull(edits.onsetDetail),
    items: summary.items.map((item) => ({
      ...item,
      value: blankToNull(edits.itemValues[item.order] ?? item.value ?? ""),
    })),
    isConfirmed: false,
  };
}

export function initialEdits(summary: SummaryContent): SummaryEdits {
  return {
    mainSymptom: summary.mainSymptom ?? "",
    onsetDetail: summary.onsetDetail ?? "",
    itemValues: Object.fromEntries(
      summary.items.map((item) => [item.order, item.value ?? ""]),
    ),
  };
}
