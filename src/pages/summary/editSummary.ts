import type {
  HealthInfoItem,
  SummaryContent,
  SummaryItemUpdate,
  SummaryUpdateRequest,
} from "@/api/summaries";

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
  extraNote: string;
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
  const next: HealthInfoItem[] = entries
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
    // PATCH 명세에서 extraNote는 null로 보내면 지워집니다.
    extraNote: blankToNull(edits.extraNote),
    medications: applyHealthEdits(
      summary.medications,
      edits.health.medications,
    ),
    conditions: applyHealthEdits(summary.conditions, edits.health.conditions),
    allergies: applyHealthEdits(summary.allergies, edits.health.allergies),
    isConfirmed: false,
  };
}

function sameEntries(
  left: HealthEntryEdit[],
  right: HealthEntryEdit[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.name === right[index].name &&
        entry.detail === right[index].detail,
    )
  );
}

function sameHealthInfo(
  left: SummaryContent[HealthKey],
  right: SummaryContent[HealthKey],
): boolean {
  // null(확인 못 했어요)과 [](없음)은 다른 값입니다.
  if (left === null || right === null) return left === right;
  return (
    left.length === right.length &&
    left.every(
      (item, index) =>
        item.name === right[index].name && item.detail === right[index].detail,
    )
  );
}

// 수정 폼의 입력에서 PATCH 요청 본문을 만듭니다. 사용자가 바꾼 칸만 담습니다.
// - 안 바꾼 칸은 보내지 않습니다(서버는 안 보낸 필드를 그대로 둡니다).
// - 비운 칸은 null(지움 또는 "확인 못 했어요")로 보냅니다.
// - 건강 정보는 바꿨다면 종류별로 통째로 보내고, 모두 지우면 [](없음)입니다.
// - 증상별 항목은 바꾼 항목만 order와 함께 보냅니다.
// - 나이대·성별·진료과·언제부터(onset)는 폼에서 고치지 않으므로 보내지 않습니다.
// 바뀐 칸이 없으면 빈 객체입니다.
export function buildSummaryUpdate(
  original: SummaryContent,
  edits: SummaryEdits,
): SummaryUpdateRequest {
  const initial = initialEdits(original);
  const applied = applySummaryEdits(original, edits);
  const request: SummaryUpdateRequest = {};

  // 입력이 달라졌더라도 공백을 다듬은 결과가 원래 값과 같으면 보내지 않습니다.
  if (
    edits.mainSymptom !== initial.mainSymptom &&
    applied.mainSymptom !== original.mainSymptom
  ) {
    request.mainSymptom = applied.mainSymptom;
  }
  if (
    edits.onsetDetail !== initial.onsetDetail &&
    applied.onsetDetail !== original.onsetDetail
  ) {
    request.onsetDetail = applied.onsetDetail;
  }
  if (
    edits.extraNote !== initial.extraNote &&
    applied.extraNote !== original.extraNote
  ) {
    request.extraNote = applied.extraNote;
  }
  for (const key of healthKeys) {
    if (
      !sameEntries(initial.health[key], edits.health[key]) &&
      !sameHealthInfo(applied[key], original[key])
    ) {
      request[key] = applied[key];
    }
  }

  const items: SummaryItemUpdate[] = [];
  for (const item of original.items) {
    const appliedItem = applied.items.find(
      (candidate) => candidate.order === item.order,
    );
    if (
      edits.itemValues[item.order] !== initial.itemValues[item.order] &&
      appliedItem &&
      appliedItem.value !== item.value
    ) {
      items.push({ order: item.order, value: appliedItem.value });
    }
  }
  if (items.length > 0) request.items = items;

  return request;
}

// 화면용 키라서 고유하기만 하면 됩니다.
// crypto.randomUUID는 HTTPS가 아닌 주소(휴대폰에서 연 개발 서버 등)에서는 없어서 쓰지 않습니다.
let nextEntryId = 0;

export function newHealthEntry(name = "", detail = ""): HealthEntryEdit {
  return { id: `entry-${nextEntryId++}`, name, detail };
}

export function initialEdits(summary: SummaryContent): SummaryEdits {
  const entries = (key: HealthKey) =>
    (summary[key] ?? []).map((info) =>
      newHealthEntry(info.name, info.detail ?? ""),
    );
  return {
    mainSymptom: summary.mainSymptom,
    onsetDetail: summary.onsetDetail ?? "",
    itemValues: Object.fromEntries(
      summary.items.map((item) => [item.order, item.value ?? ""]),
    ),
    extraNote: summary.extraNote ?? "",
    health: {
      medications: entries("medications"),
      conditions: entries("conditions"),
      allergies: entries("allergies"),
    },
  };
}
