import { DesignIcon } from "@/components/DesignIcon";
import { ScreenIcon } from "@/components/ScreenElements";
import { formatTodayHours } from "@/pages/hospitals/hospitalSearch";
import type { Hospital } from "@/api/hospitals";

export function HospitalCard({
  cardId,
  hospital,
  departmentCode,
  now,
  rank,
  selected,
  onSelect,
}: {
  // 지도 마커를 눌렀을 때 이 카드로 스크롤하는 데 쓰는 ID입니다.
  cardId?: string;
  hospital: Hospital;
  // 추천 진료과입니다. 병원이 그 진료과를 가지고 있으면 진료과 이름을, 아니면 종별 이름을 보여 줍니다.
  departmentCode: string;
  // 진료 시간 문구의 "오늘·내일"을 정하는 기준 시각입니다.
  now: Date;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const departmentName =
    hospital.departments.find(
      (department) => department.departmentCode === departmentCode,
    )?.departmentName ?? hospital.hospitalTypeName;
  const hours = formatTodayHours(hospital.today, now);
  const directionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent(hospital.name)},${hospital.latitude},${hospital.longitude}`;
  return (
    <li
      id={cardId}
      className={`flex scroll-mt-4 scroll-mb-[calc(69px+1rem)] flex-col gap-3 rounded-[20px] border-2 bg-surface p-4 ${selected ? "border-brand" : "border-line"}`}
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
            {departmentName} · {hospital.distanceKm.toFixed(1)}km
          </span>
        </span>
      </button>
      {rank === 1 && (
        <span className="self-start rounded-full bg-brand-soft px-3 py-1 text-[0.889rem] font-bold text-brand-strong">
          가장 가까워요
        </span>
      )}
      {/* 진료 시간 정보가 없는 병원은 이 줄을 보여 주지 않습니다. 아래 안내대로 전화로 확인합니다. */}
      {hours && (
        <p
          className={`flex items-center gap-2 text-[0.889rem] font-medium ${hours.open ? "text-success" : "text-muted"}`}
        >
          <span
            aria-hidden="true"
            className={`size-[8px] shrink-0 rounded-full ${hours.open ? "bg-success" : "bg-control"}`}
          />
          {hours.text}
        </p>
      )}
      {/* 큰 글자나 좁은 화면에서 두 버튼이 한 줄에 안 들어가면 위아래로 쌓습니다. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-[10px]">
        {/* 전화번호가 없는 병원은 전화 버튼을 두지 않습니다. */}
        {hospital.phoneNumber && (
          <a
            href={`tel:${hospital.phoneNumber}`}
            aria-label={`${hospital.name} 전화`}
            className="flex min-h-[max(44px,3rem)] items-center justify-center gap-[6px] rounded-[14px] bg-brand px-[8px] font-bold whitespace-nowrap text-white"
          >
            <DesignIcon name="phone" size={20} />
            전화
          </a>
        )}
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
