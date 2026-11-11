import { useEffect, useRef, useState } from "react";
import {
  loadKakaoMaps,
  type KakaoCustomOverlay,
  type KakaoLatLng,
  type KakaoMap,
  type KakaoMapsApi,
} from "@/components/map/kakaoMapLoader";
import {
  hospitalMarkerClassName,
  userLocationClassName,
} from "@/components/map/markerStyle";
import { nextMapLevel } from "@/components/map/mapLevel";
import { syncMarkerLabels } from "@/components/map/markerLabels";
import type { HospitalMapProps } from "@/components/map/types";

interface KakaoHospitalMapProps extends HospitalMapProps {
  appKey: string;
  onLoadError: () => void;
}

interface HospitalMarker {
  button: HTMLButtonElement;
  overlay: KakaoCustomOverlay;
  position: KakaoLatLng;
}

// 범위를 맞추기 전 잠깐 쓰는 중심(춘천)입니다. 위치가 그려지면 바로 바뀝니다.
const initialCenter = { latitude: 37.8813, longitude: 127.7298 };
const fitPadding = 48;
const singlePointLevel = 4;
const zoomButtonClassName =
  "grid h-[44px] w-[44px] place-items-center rounded-[12px] border border-line bg-surface text-[1.5rem] font-bold text-ink shadow-md";

export function KakaoHospitalMap({
  appKey,
  hospitals,
  selectedHospitalId,
  userLocation,
  onSelectHospital,
  onLoadError,
}: KakaoHospitalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [kakao, setKakao] = useState<{ maps: KakaoMapsApi; map: KakaoMap }>();
  const markersRef = useRef(new Map<string, HospitalMarker>());
  const panReadyRef = useRef(false);
  const latestRef = useRef({
    hospitals,
    userLocation,
    onSelectHospital,
    onLoadError,
  });
  // 부모가 렌더할 때마다 새 배열을 넘겨도 위치가 같으면 마커를 다시 그리지 않습니다.
  const pointsKey = JSON.stringify([
    hospitals.map(({ id, latitude, longitude }) => [id, latitude, longitude]),
    userLocation && [userLocation.latitude, userLocation.longitude],
  ]);
  // 이름만 바뀌면 지도 범위를 다시 맞추지 않고 마커의 읽기 이름만 바꿉니다.
  const labelsKey = JSON.stringify(hospitals.map(({ id, name }) => [id, name]));

  useEffect(() => {
    latestRef.current = {
      hospitals,
      userLocation,
      onSelectHospital,
      onLoadError,
    };
  });

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps(appKey)
      .then((maps) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        const map = new maps.Map(container, {
          center: new maps.LatLng(
            initialCenter.latitude,
            initialCenter.longitude,
          ),
          level: singlePointLevel,
        });
        setKakao({ maps, map });
      })
      .catch(() => {
        if (!cancelled) latestRef.current.onLoadError();
      });
    return () => {
      cancelled = true;
    };
  }, [appKey]);

  useEffect(() => {
    if (!kakao) return;
    const { maps, map } = kakao;
    const { hospitals, userLocation } = latestRef.current;
    const overlays: KakaoCustomOverlay[] = [];
    const positions: KakaoLatLng[] = [];
    const markers = markersRef.current;
    markers.clear();
    hospitals.forEach((hospital) => {
      const position = new maps.LatLng(hospital.latitude, hospital.longitude);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(hospital.rank);
      button.addEventListener("click", () =>
        latestRef.current.onSelectHospital(hospital.id),
      );
      const overlay = new maps.CustomOverlay({
        position,
        content: button,
        clickable: true,
      });
      overlay.setMap(map);
      overlays.push(overlay);
      positions.push(position);
      markers.set(hospital.id, { button, overlay, position });
    });
    if (userLocation) {
      const position = new maps.LatLng(
        userLocation.latitude,
        userLocation.longitude,
      );
      const dot = document.createElement("span");
      dot.className = userLocationClassName;
      dot.setAttribute("aria-hidden", "true");
      const overlay = new maps.CustomOverlay({
        position,
        content: dot,
        zIndex: 0,
      });
      overlay.setMap(map);
      overlays.push(overlay);
      positions.push(position);
    }
    if (positions.length === 1) {
      map.setCenter(positions[0]);
      map.setLevel(singlePointLevel);
    } else if (positions.length > 1) {
      const bounds = new maps.LatLngBounds();
      positions.forEach((position) => bounds.extend(position));
      map.setBounds(bounds, fitPadding, fitPadding, fitPadding, fitPadding);
    }
    // 마커를 새로 그린 직후에는 전체 범위를 유지하고, 그 뒤 선택이 바뀔 때만 이동합니다.
    panReadyRef.current = false;
    return () => {
      overlays.forEach((overlay) => overlay.setMap(null));
      markers.clear();
    };
  }, [kakao, pointsKey]);

  useEffect(() => {
    if (!kakao) return;
    syncMarkerLabels(markersRef.current, latestRef.current.hospitals);
  }, [kakao, pointsKey, labelsKey]);

  useEffect(() => {
    if (!kakao) return;
    markersRef.current.forEach(({ button, overlay }, id) => {
      const selected = id === selectedHospitalId;
      button.className = hospitalMarkerClassName(selected);
      button.setAttribute("aria-pressed", String(selected));
      overlay.setZIndex(selected ? 2 : 1);
    });
    const selected =
      selectedHospitalId === undefined
        ? undefined
        : markersRef.current.get(selectedHospitalId);
    if (panReadyRef.current && selected) kakao.map.panTo(selected.position);
    panReadyRef.current = true;
  }, [kakao, pointsKey, selectedHospitalId]);

  function onMapKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // 마커 버튼에 초점이 있을 때의 키는 버튼이 쓰도록 둡니다.
    if (!kakao || event.target !== event.currentTarget) return;
    const step = 80;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) kakao.map.panBy(move[0], move[1]);
    else if (event.key === "+" || event.key === "=") zoom("in");
    else if (event.key === "-") zoom("out");
    else return;
    event.preventDefault();
  }

  function zoom(direction: "in" | "out") {
    if (!kakao) return;
    kakao.map.setLevel(nextMapLevel(kakao.map.getLevel(), direction), {
      animate: true,
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* SDK의 키보드 지원은 확인하지 못해, 초점을 받는 지도 영역에서 방향키·+/-를 직접 처리합니다. 린트 규칙은 application 역할을 조작 요소로 보지 않아 이 요소에서만 끕니다. */}
        {/* eslint-disable jsx-a11y-x/no-noninteractive-element-interactions, jsx-a11y-x/no-noninteractive-tabindex */}
        <div
          ref={containerRef}
          role="application"
          tabIndex={0}
          aria-label="병원 위치 지도. 방향키로 이동하고 더하기, 빼기 키로 확대와 축소를 해요."
          onKeyDown={onMapKeyDown}
          className="h-[240px] overflow-hidden rounded-[12px] border border-line bg-brand-soft [&_img]:max-w-none"
        />
        {/* eslint-enable jsx-a11y-x/no-noninteractive-element-interactions, jsx-a11y-x/no-noninteractive-tabindex */}
        {kakao ? (
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
            <button
              type="button"
              aria-label="지도 확대"
              onClick={() => zoom("in")}
              className={zoomButtonClassName}
            >
              <span aria-hidden="true">+</span>
            </button>
            <button
              type="button"
              aria-label="지도 축소"
              onClick={() => zoom("out")}
              className={zoomButtonClassName}
            >
              <span aria-hidden="true">−</span>
            </button>
          </div>
        ) : (
          <p
            role="status"
            className="absolute inset-0 z-10 grid place-items-center rounded-[12px] bg-brand-soft p-4 text-center text-muted"
          >
            지도를 불러오는 중이에요.
          </p>
        )}
      </div>
      <p className="text-[0.833rem] text-muted">
        숫자를 누르면 병원을 선택할 수 있어요.
      </p>
    </div>
  );
}
