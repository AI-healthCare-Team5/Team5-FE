import type { Hospital } from "@/api/hospitals";
import { getDirectionsUrl } from "@/components/map/directions";
import { formatEmergencyRoomMeta } from "@/pages/emergency/emergencyRooms";

const actionClass =
  "flex min-h-[max(44px,2.644rem)] flex-1 items-center justify-center rounded-[14px] px-2 text-center text-[0.944rem] font-bold";

export function EmergencyRoomCard({
  cardId,
  room,
  rank,
  selected,
  onSelect,
}: {
  // 지도 마커를 눌렀을 때 이 카드로 스크롤하는 데 쓰는 ID입니다.
  cardId: string;
  room: Hospital;
  // 지도 마커의 번호와 같습니다.
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li
      id={cardId}
      className={`flex scroll-mt-4 scroll-mb-4 flex-col gap-3 rounded-[20px] border-2 bg-surface px-4.5 py-4 ${selected ? "border-ink" : "border-line"}`}
    >
      {/* 버튼 안에는 제목 요소를 둘 수 없어, 제목 안에 선택 버튼을 둡니다. */}
      <h3 className="text-[1.111rem] leading-[1.4] font-bold">
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className="flex min-h-[44px] items-start gap-3 text-left"
        >
          <span
            aria-hidden="true"
            className={`grid size-[1.778rem] shrink-0 place-items-center rounded-full text-white ${selected ? "bg-ink" : "bg-brand"}`}
          >
            {rank}
          </span>
          <span className="min-w-0">{room.name}</span>
        </button>
      </h3>
      <p className="-mt-2 pl-[calc(1.778rem+0.75rem)] text-[0.889rem] text-muted">
        {formatEmergencyRoomMeta(room)}
      </p>
      <div className="flex gap-2.5">
        {/* 전화번호가 없는 응급실은 전화 버튼을 그리지 않습니다. */}
        {room.phoneNumber && (
          <a
            href={`tel:${room.phoneNumber}`}
            aria-label={`${room.name} 전화`}
            className={`${actionClass} bg-ink text-white`}
          >
            전화
          </a>
        )}
        <a
          href={getDirectionsUrl(room)}
          target="_blank"
          rel="noreferrer"
          aria-label={`${room.name} 길 찾기 (새 창)`}
          className={`${actionClass} border-2 border-ink bg-surface text-ink`}
        >
          길 찾기
        </a>
      </div>
    </li>
  );
}
