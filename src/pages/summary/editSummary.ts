import type { HealthInfo, SummaryContent } from "@/components/summary/types";

export const healthKeys = ["medications", "conditions", "allergies"] as const;
export type HealthKey = (typeof healthKeys)[number];

export interface HealthEntryEdit {
  // 목록에서 항목을 지워도 입력란이 섞이지 않게 붙이는 화면용 키입니다.
  id: string;
  name: string;
  detail: string;
}

export interface SummaryEdits {
  mainSymptom: string;
  onsetDetail: string;
  // 증상별 항목의 값입니다. 키는 항목의 order입니다.
  itemValues: Record<number, string>;
  health: Record<HealthKey, HealthEntryEdit[]>;
}

// PATCH 명세의 길이 제한입니다. 명세에 제한이 없는 칸은 주된 증상과 같은 100자로 둡니다.
export const maxLengths = {
  mainSymptom: 100,
  onsetDetail: 50,
  other: 100,
} as const;

// 주된 증상은 서버에서 null·빈 값이 안 되므로 비우면 저장할 수 없습니다.
export function canSaveEdits(edits: SummaryEdits): boolean {
  return edits.mainSymptom.trim() !== "";
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// 원래 null(못 물음)이고 아무것도 넣지 않았으면 null로 둡니다.
// 그 밖에는 이름이 있는 항목만 남기고, 다 지우면 [](없음)이 됩니다.
function applyHealthEdits(
  original: SummaryContent[HealthKey],
  entries: HealthEntryEdit[],
): SummaryContent[HealthKey] {
  const next: HealthInfo[] = entries
    .filter((entry) => entry.name.trim() !== "")
    .map((entry) => ({
      name: entry.name.trim(),
      detail: blankToNull(entry.detail),
    }));
  return original === null && next.length === 0 ? null : next;
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
    medications: applyHealthEdits(
      summary.medications,
      edits.health.medications,
    ),
    conditions: applyHealthEdits(summary.conditions, edits.health.conditions),
    allergies: applyHealthEdits(summary.allergies, edits.health.allergies),
    isConfirmed: false,
  };
}

export function newHealthEntry(name = "", detail = ""): HealthEntryEdit {
  return { id: crypto.randomUUID(), name, detail };
}

export function initialEdits(summary: SummaryContent): SummaryEdits {
  const entries = (key: HealthKey) =>
    (summary[key] ?? []).map((info) =>
      newHealthEntry(info.name, info.detail ?? ""),
    );
  return {
    mainSymptom: summary.mainSymptom ?? "",
    onsetDetail: summary.onsetDetail ?? "",
    itemValues: Object.fromEntries(
      summary.items.map((item) => [item.order, item.value ?? ""]),
    ),
    health: {
      medications: entries("medications"),
      conditions: entries("conditions"),
      allergies: entries("allergies"),
    },
  };
}
