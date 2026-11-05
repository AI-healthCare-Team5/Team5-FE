import type { Relation } from "@/api/enums";
import {
  getErrorMessage,
  isApiError,
  isSessionGone,
  isUnauthenticated,
} from "@/api/errors";
import type { Guardian } from "@/api/guardians";
import { getEmergencyCard, type EmergencyCard } from "@/api/intakes";
import { formatCollectedValue, UNCHECKED_TEXT } from "@/api/values";
import {
  formatAgeGender,
  formatHealthInfo,
} from "@/components/summary/summaryRows";

export interface EmergencyCardRow {
  key: string;
  label: string;
  value: string;
  // "확인 못 했어요"는 디자인처럼 흐리게 보여 줍니다.
  unchecked: boolean;
}

const relationLabels: Record<Relation, string> = {
  SPOUSE: "배우자",
  SON: "아들",
  DAUGHTER: "딸",
  ETC: "가족 · 지인",
};

// 응급 카드 항목 순서: 주된 증상 / 시작 시점 / 나이 · 성별 / 복용약 / 앓는 병 / 알레르기 / 현재 위치
// 보호자 연락처는 전화 버튼이 있어 따로 그립니다.
// 카드가 없으면(P01 미리 보기, 조회 실패) 위치 말고는 모두 "확인 못 했어요"입니다.
export function buildEmergencyCardRows(
  card: EmergencyCard | null,
  address: string | null,
): EmergencyCardRow[] {
  const rows = [
    {
      key: "mainSymptom",
      label: "주된 증상",
      value: formatCollectedValue(card?.mainSymptom ?? null),
    },
    {
      key: "onset",
      label: "시작 시점",
      value: formatCollectedValue(card?.onsetDetail ?? null),
    },
    {
      key: "ageGender",
      label: "나이 · 성별",
      value: formatAgeGender(card?.ageGroup ?? null, card?.gender ?? null),
    },
    {
      key: "medications",
      label: "복용 중인 약",
      value: formatHealthInfo(card?.medications ?? null),
    },
    {
      key: "conditions",
      label: "앓고 있는 병",
      value: formatHealthInfo(card?.conditions ?? null),
    },
    {
      key: "allergies",
      label: "알레르기",
      value: formatHealthInfo(card?.allergies ?? null),
    },
    {
      key: "location",
      label: "현재 위치",
      value: formatCollectedValue(address),
    },
  ];
  return rows.map((row) => ({
    ...row,
    unchecked: row.value === UNCHECKED_TEXT,
  }));
}

// "딸 · 010-0000-0000"
export function formatGuardian(guardian: Guardian): string {
  return `${relationLabels[guardian.relation]} · ${guardian.phoneNumber}`;
}

// 전화 걸 주소입니다. 내 정보에서 받은 가린 번호(010-****-5678)는 걸 수 없어 null입니다.
export function guardianTelHref(guardian: Guardian): string | null {
  if (guardian.phoneNumber.includes("*")) return null;
  const digits = guardian.phoneNumber.replace(/\D/g, "");
  return digits === "" ? null : `tel:${digits}`;
}

// 카드 머리의 "10:52 작성"에 쓰는 한국 시각입니다.
export function formatCardTime(createdAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(createdAt));
}

export type EmergencyCardLoad =
  | { kind: "loaded"; card: EmergencyCard }
  // 문진이 없거나 내 것이 아닙니다(SUMMARY_403·404). 명세대로 처음(S01)으로 보냅니다.
  | { kind: "gone" }
  // 그 밖의 실패입니다. 화면은 카드를 빈 값으로 그리고 다시 시도할 수 있게 합니다.
  | { kind: "failed"; message: string };

// 응급 카드를 불러옵니다. 로그인이 풀렸으면(AUTH_401) 명세대로 비로그인으로 한 번 더 받습니다.
// 취소와 코드 실수(ApiError가 아닌 오류)는 그대로 던집니다.
export async function loadEmergencyCard(
  intakeId: string,
  signal?: AbortSignal,
): Promise<EmergencyCardLoad> {
  try {
    return { kind: "loaded", card: await getEmergencyCard(intakeId, signal) };
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (isUnauthenticated(error)) {
      return loadEmergencyCardAsGuest(intakeId, signal);
    }
    return toFailure(error);
  }
}

async function loadEmergencyCardAsGuest(
  intakeId: string,
  signal?: AbortSignal,
): Promise<EmergencyCardLoad> {
  try {
    return { kind: "loaded", card: await getEmergencyCard(intakeId, signal) };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return toFailure(error);
  }
}

function toFailure(error: unknown): EmergencyCardLoad {
  if (isSessionGone(error)) return { kind: "gone" };
  return { kind: "failed", message: getErrorMessage(error) };
}
