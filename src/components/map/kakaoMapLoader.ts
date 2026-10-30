// 이 컴포넌트에서 쓰는 카카오맵 JavaScript API만 타입으로 선언합니다.
export type KakaoLatLng = object;

export interface KakaoLatLngBounds {
  extend(position: KakaoLatLng): void;
}

export interface KakaoMap {
  setBounds(
    bounds: KakaoLatLngBounds,
    paddingTop?: number,
    paddingRight?: number,
    paddingBottom?: number,
    paddingLeft?: number,
  ): void;
  setCenter(position: KakaoLatLng): void;
  setLevel(level: number): void;
  panTo(position: KakaoLatLng): void;
}

export interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void;
  setZIndex(zIndex: number): void;
}

export interface KakaoMapsApi {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement;
    clickable?: boolean;
    zIndex?: number;
  }) => KakaoCustomOverlay;
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}

export function getKakaoMapSdkUrl(appKey: string) {
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
}

// sdk.js 뒤에 maps.load()가 지도 코어 스크립트를 따로 불러오는데, 그 실패는 알려 주지 않습니다.
// 그래서 전체 로드에 제한 시간을 두고, 넘기면 실패로 처리합니다.
export const kakaoMapLoadTimeoutMs = 10_000;

let sdkPromise: Promise<KakaoMapsApi> | undefined;

// SDK는 한 번만 불러오고, 실패하면 다음 화면에서 처음부터 다시 시도할 수 있게 비웁니다.
export function loadKakaoMaps(
  appKey: string,
  timeoutMs = kakaoMapLoadTimeoutMs,
) {
  sdkPromise ??= new Promise<KakaoMapsApi>((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const timer = setTimeout(() => {
      fail(new Error("카카오맵 SDK를 제시간에 불러오지 못했어요."));
    }, timeoutMs);
    function succeed(maps: KakaoMapsApi) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(maps);
    }
    // 반쯤 불러온 SDK가 남으면 다시 시도해도 같은 상태에 머무르므로 함께 지웁니다.
    function fail(error: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.remove();
      delete window.kakao;
      reject(error);
    }
    script.src = getKakaoMapSdkUrl(appKey);
    script.async = true;
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        fail(new Error("카카오맵 SDK를 찾지 못했어요."));
        return;
      }
      maps.load(() => succeed(maps));
    };
    script.onerror = () => {
      fail(new Error("카카오맵 SDK를 불러오지 못했어요."));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    sdkPromise = undefined;
    throw error;
  });
  return sdkPromise;
}
