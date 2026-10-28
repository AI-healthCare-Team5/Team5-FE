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

let sdkPromise: Promise<KakaoMapsApi> | undefined;

// SDK는 한 번만 불러오고, 실패하면 다음 화면에서 다시 시도할 수 있게 비웁니다.
export function loadKakaoMaps(appKey: string) {
  sdkPromise ??= new Promise<KakaoMapsApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = getKakaoMapSdkUrl(appKey);
    script.async = true;
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error("카카오맵 SDK를 찾지 못했어요."));
        return;
      }
      maps.load(() => resolve(maps));
    };
    script.onerror = () => {
      reject(new Error("카카오맵 SDK를 불러오지 못했어요."));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    sdkPromise = undefined;
    throw error;
  });
  return sdkPromise;
}
