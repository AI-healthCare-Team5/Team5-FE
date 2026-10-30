import { hospitalMarkerClassName } from "@/components/map/markerStyle";
import type { HospitalMapProps } from "@/components/map/types";

// 카카오맵을 쓸 수 없을 때(앱 키 없음, SDK 로드 실패, 표시할 위치 없음) 보여주는 대체 지도입니다.
export function HospitalMapPreview({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
}: HospitalMapProps) {
  const latitudes = hospitals.map((hospital) => hospital.latitude);
  const longitudes = hospitals.map((hospital) => hospital.longitude);
  const minLatitude = Math.min(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const latitudeRange = Math.max(...latitudes) - minLatitude;
  const longitudeRange = Math.max(...longitudes) - minLongitude;
  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="병원 위치 예시"
        className="relative h-[240px] overflow-hidden rounded-[12px] border border-line bg-brand-soft"
      >
        <svg
          aria-hidden="true"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 340 240"
        >
          <path
            d="M0 180 340 20M110 0 160 240M270 0 220 240M0 60 340 130"
            stroke="var(--color-surface)"
            strokeWidth="18"
          />
          <path
            d="M0 180 340 20"
            stroke="var(--color-brand-ring)"
            strokeWidth="2"
          />
        </svg>
        {hospitals.map((hospital, index) => (
          <button
            key={hospital.id}
            type="button"
            aria-label={`${hospital.name} 선택`}
            aria-pressed={selectedHospitalId === hospital.id}
            onClick={() => onSelectHospital(hospital.id)}
            style={{
              left: `${longitudeRange === 0 ? 50 : 18 + ((hospital.longitude - minLongitude) / longitudeRange) * 64}%`,
              top: `${latitudeRange === 0 ? 50 : 18 + (1 - (hospital.latitude - minLatitude) / latitudeRange) * 64}%`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${hospitalMarkerClassName(selectedHospitalId === hospital.id)}`}
          >
            {index + 1}
          </button>
        ))}
        {hospitals.length === 0 && (
          <p className="absolute inset-0 grid place-items-center p-4 text-center text-muted">
            표시할 병원이 없어요.
          </p>
        )}
        <span className="absolute bottom-2 left-2 rounded bg-surface/90 px-2 py-1 text-[0.889rem] text-muted">
          병원 위치 예시
        </span>
      </div>
      <p className="text-[0.833rem] text-muted">
        숫자를 누르면 병원을 선택할 수 있어요.
      </p>
    </div>
  );
}
