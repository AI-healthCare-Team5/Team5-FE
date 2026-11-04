import type { Hospital } from "@/api/hospitals";
import { getDirectionsUrl } from "@/components/map/directions";
import { formatEmergencyRoomMeta } from "@/pages/emergency/emergencyRooms";

const actionClass =
  "flex min-h-[max(44px,2.644rem)] flex-1 items-center justify-center rounded-[14px] px-2 text-center text-[0.944rem] font-bold";

export function EmergencyRoomCard({ room }: { room: Hospital }) {
  return (
    <li className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface px-4.5 py-4">
      <div className="flex flex-col">
        <h3 className="text-[1.111rem] leading-[1.4] font-bold">{room.name}</h3>
        <p className="text-[0.889rem] text-muted">
          {formatEmergencyRoomMeta(room)}
        </p>
      </div>
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
