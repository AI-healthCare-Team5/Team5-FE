import type { Hospital } from "@/api/hospitals";
import { DesignIcon } from "@/components/DesignIcon";

// S05c에서 병원을 찾지 못했을 때 곁들이는 가장 가까운 보건소입니다(GET /api/hospitals/health-centers/nearest).
// 반경 제한 없이 찾은 1곳이라 거리도 함께 보여 줍니다. 전화번호가 없으면 전화 버튼을 두지 않습니다.
export function HealthCenterCard({ hospital }: { hospital: Hospital }) {
  return (
    <section
      aria-labelledby="health-center"
      className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4"
    >
      <h2 id="health-center" className="text-[0.889rem] font-bold text-muted">
        가까운 보건소
      </h2>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[1.111rem] font-bold break-words">{hospital.name}</p>
        <p className="text-[0.889rem] break-words text-muted">
          {hospital.address} · {hospital.distanceKm.toFixed(1)}km
        </p>
      </div>
      {hospital.phoneNumber && (
        <a
          href={`tel:${hospital.phoneNumber}`}
          aria-label={`${hospital.name} 전화`}
          className="flex min-h-[max(44px,3rem)] items-center justify-center gap-[6px] rounded-[14px] bg-brand px-[8px] font-bold text-white"
        >
          <DesignIcon name="phone" size={20} />
          전화하기
        </a>
      )}
    </section>
  );
}
