export interface MapHospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface HospitalMapProps {
  hospitals: readonly MapHospital[];
  selectedHospitalId?: string;
  onSelectHospital: (id: string) => void;
}

// SDK 연결 전 화면 검토용입니다. 병원 목록 소유 화면에서 동일한 props를 전달합니다.
export function HospitalMap({
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
            className={`absolute grid h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white font-bold text-white shadow-md ${selectedHospitalId === hospital.id ? "z-10 bg-ink ring-4 ring-brand/30" : "bg-brand"}`}
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
