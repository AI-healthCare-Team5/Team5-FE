import type { MapLocation } from "@/components/map/types";

// 위치 권한을 받은 뒤 좌표를 얻기까지 기다리는 시간입니다. 권한 창이 떠 있는 동안은 세지 않습니다.
export const currentPositionTimeoutMs = 10_000;
// 이만큼 지나지 않은 위치는 다시 측정하지 않고 씁니다.
export const currentPositionMaximumAgeMs = 60_000;

// 브라우저에 현재 위치를 한 번 묻습니다. 거부, 미지원, 측정 실패, 시간 초과면 예외 없이 null입니다.
// 이 함수는 좌표를 어디에도 보내지 않습니다.
export function requestCurrentPosition(
  timeoutMs = currentPositionTimeoutMs,
): Promise<MapLocation | null> {
  return new Promise((resolve) => {
    const geolocation =
      typeof navigator === "undefined" ? undefined : navigator.geolocation;
    if (!geolocation) {
      resolve(null);
      return;
    }
    try {
      geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        () => resolve(null),
        { timeout: timeoutMs, maximumAge: currentPositionMaximumAgeMs },
      );
    } catch {
      // 일부 브라우저는 보안 컨텍스트가 아니면 콜백 대신 예외를 던집니다.
      resolve(null);
    }
  });
}
