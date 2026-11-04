import { isApiError } from "@/api/errors";
import { getEmergencyRooms, type Hospital } from "@/api/hospitals";
import type { MapLocation } from "@/components/map/types";

// 응급실 카드의 "4.8km · 24시간" 줄입니다.
// 응답의 today.is24Hours가 true일 때만 24시간이라고 적고, 그 외에는 거리만 적습니다.
export function formatEmergencyRoomMeta(
  room: Pick<Hospital, "distanceKm" | "today">,
): string {
  const distance = `${room.distanceKm.toFixed(1)}km`;
  return room.today?.is24Hours ? `${distance} · 24시간` : distance;
}

// E01에 보여 줄 가까운 응급실을 가까운 순으로 찾습니다(기본 30km·2곳).
// 위치가 없거나 찾지 못하면 빈 목록이고, 화면은 119 안내만 남깁니다.
// 위치와 지역이 모두 없으면 서버가 HOSPITAL_400(location)으로 응답하므로 요청하지 않습니다.
export async function findEmergencyRooms(
  location: MapLocation | null,
  signal?: AbortSignal,
): Promise<Hospital[]> {
  if (!location) return [];
  try {
    const result = await getEmergencyRooms(
      { latitude: location.latitude, longitude: location.longitude },
      signal,
    );
    return result.hospitals;
  } catch (error) {
    // API 오류(HOSPITAL_400·500, 네트워크, 형식 오류)는 119 안내만 남깁니다.
    // 취소와 개발자 실수는 그대로 던집니다.
    if (isApiError(error)) return [];
    throw error;
  }
}
