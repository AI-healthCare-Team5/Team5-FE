import { DesignIcon } from "@/components/DesignIcon";
import { ScreenIcon } from "@/components/ScreenElements";
import type { Hospital } from "@/pages/hospitals/types";

export function HospitalCard({
  hospital,
  rank,
  selected,
  onSelect,
}: {
  hospital: Hospital;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const directionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent(hospital.name)},${hospital.latitude},${hospital.longitude}`;
  return (
    <li
      className={`flex flex-col gap-3 rounded-[20px] border-2 bg-surface p-4 ${selected ? "border-brand" : "border-line"}`}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex min-h-[44px] items-start gap-3 text-left"
      >
        <span
          aria-hidden="true"
          className={`grid size-[1.778rem] shrink-0 place-items-center rounded-full font-bold text-white ${selected ? "bg-ink" : "bg-brand"}`}
        >
          {rank}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[1.111rem] font-bold">{hospital.name}</span>
          <span className="text-[0.889rem] text-muted">
            {hospital.department} · {hospital.distanceKm.toFixed(1)}km
          </span>
        </span>
      </button>
      {rank === 1 && (
        <span className="self-start rounded-full bg-brand-soft px-3 py-1 text-[0.889rem] font-bold text-brand-strong">
          가장 가까워요
        </span>
      )}
      <p
        className={`flex items-center gap-2 text-[0.889rem] font-medium ${hospital.open ? "text-success" : "text-muted"}`}
      >
        <span
          aria-hidden="true"
          className={`size-[8px] shrink-0 rounded-full ${hospital.open ? "bg-success" : "bg-control"}`}
        />
        {hospital.hours}
      </p>
      {/* 큰 글자나 좁은 화면에서 두 버튼이 한 줄에 안 들어가면 위아래로 쌓습니다. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-[10px]">
        <a
          href={`tel:${hospital.phone}`}
          aria-label={`${hospital.name} 전화`}
          className="flex min-h-[max(44px,3rem)] items-center justify-center gap-[6px] rounded-[14px] bg-brand px-[8px] font-bold whitespace-nowrap text-white"
        >
          <DesignIcon name="phone" size={20} />
          전화
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`${hospital.name} 길 찾기 (새 창)`}
          className="flex min-h-[max(44px,3rem)] items-center justify-center gap-[6px] rounded-[14px] border-2 border-brand bg-surface px-[8px] font-bold whitespace-nowrap text-brand-strong"
        >
          <ScreenIcon name="navigation" size={20} />길 찾기
        </a>
      </div>
    </li>
  );
}
