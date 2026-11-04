import type { IntakeResponse } from "@/api/intakes";
import type { MapLocation } from "@/components/map/types";

// 응급 전환(E01)에 넘길 정보입니다. 응급 카드(E02, #30)는 intakeId로 조회합니다.
export interface EmergencyEntry {
  intakeId: string;
  // E01 "말씀하신 내용"입니다. 받지 못했으면 null이고, 화면은 그 영역을 그리지 않습니다.
  userUtterance: string | null;
}

// E01에서 한 번 물어본 현재 위치입니다. 응급 카드(E02)의 "현재 위치"도 이 값을 씁니다.
// unavailable은 거부·미지원·측정 실패이며, 다시 묻지 않고 119 안내만 남깁니다.
export type CurrentLocation =
  | { status: "unasked" }
  | { status: "asking" }
  | { status: "found"; location: MapLocation }
  | { status: "unavailable" };

// 문진 시작·답변 응답이 응급 전환(status EMERGENCY)이면 E01에 넘길 정보를, 아니면 null을 돌려줍니다.
// 위험 신호 판정은 서버 규칙이 하므로 화면은 status만 봅니다.
// emergency가 비어 있는 응답이어도 119 안내가 먼저이므로 전환합니다.
export function toEmergencyEntry(
  intake: Pick<IntakeResponse, "intakeId" | "status" | "emergency">,
): EmergencyEntry | null {
  if (intake.status !== "EMERGENCY") return null;
  const utterance = intake.emergency?.userUtterance?.trim();
  return { intakeId: intake.intakeId, userUtterance: utterance || null };
}
