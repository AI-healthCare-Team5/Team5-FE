import {
  loadKakaoMaps,
  type KakaoGeocoderResult,
  type KakaoMapsApi,
} from "@/components/map/kakaoMapLoader";

// 주소 요청이 실패해도 SDK가 콜백을 부르지 않을 수 있어 제한 시간을 둡니다.
export const reverseGeocodeTimeoutMs = 5000;

// 도로명 주소를 먼저 쓰고, 없으면 지번 주소를 씁니다.
export function pickAddress(results: KakaoGeocoderResult[]): string | null {
  const first = results[0];
  return (
    first?.road_address?.address_name.trim() ||
    first?.address?.address_name.trim() ||
    null
  );
}

function requestAddress(
  maps: KakaoMapsApi,
  latitude: number,
  longitude: number,
  timeoutMs: number,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      const { Geocoder, Status } = maps.services;
      new Geocoder().coord2Address(longitude, latitude, (results, status) => {
        const address = status === Status.OK ? pickAddress(results) : null;
        clearTimeout(timer);
        resolve(address);
      });
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

// 좌표를 주소 문자열로 바꿉니다. 주소를 얻지 못하면 예외 없이 null을 돌려줍니다.
// 좌표는 카카오맵 SDK에만 넘기고 진료한장 서버로 보내지 않습니다. 위치 권한은 호출한 쪽이 다룹니다.
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  timeoutMs = reverseGeocodeTimeoutMs,
): Promise<string | null> {
  const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
  if (!appKey) return null;
  try {
    const maps = await loadKakaoMaps(appKey);
    return await requestAddress(maps, latitude, longitude, timeoutMs);
  } catch {
    return null;
  }
}
