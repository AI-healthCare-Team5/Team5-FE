import type { Guardian } from "@/api/guardians";
import type { EmergencyCard } from "@/api/intakes";
import { DesignIcon } from "@/components/DesignIcon";
import {
  buildEmergencyCardRows,
  formatCardTime,
  formatGuardian,
  guardianTelHref,
} from "@/pages/emergency-card/emergencyCard";

// 구급대원에게 보여 줄 카드입니다. 현재 위치는 주소 문자열로 받습니다(좌표 → 주소 변환은 화면이 합니다).
// card가 null이면(P01 미리 보기, 조회 실패) 위치와 보호자 말고는 "확인 못 했어요"입니다.
// 불러오는 동안에는 "확인 못 했어요"로 오해하지 않게 항목을 그리지 않습니다.
export function EmergencyCardView({
  card,
  address,
  guardian,
  loading = false,
}: {
  card: EmergencyCard | null;
  address: string | null;
  guardian: Guardian | null;
  loading?: boolean;
}) {
  const rows = buildEmergencyCardRows(card, address);
  const telHref = guardian ? guardianTelHref(guardian) : null;
  return (
    <section
      aria-busy={loading}
      className="overflow-hidden rounded-[20px] border-2 border-ink bg-surface"
    >
      <div className="flex items-center justify-between gap-3 bg-emergency px-5 py-3 text-white">
        <h1 className="shrink-0 text-[1.222rem] font-bold whitespace-nowrap">
          응급 카드
        </h1>
        {card && (
          <p className="text-right text-[0.889rem]">
            {formatCardTime(card.createdAt)} 작성
          </p>
        )}
      </div>
      {loading ? (
        <p role="status" className="px-5 py-6 text-muted">
          응급 카드를 불러오고 있어요.
        </p>
      ) : (
        <dl className="divide-y divide-ink">
          {rows.map(({ key, label, value, unchecked }) => (
            <div key={key} className="px-5 py-3">
              <dt className="text-[0.889rem] font-medium text-subtle">
                {label}
              </dt>
              <dd
                className={`text-[1.222rem] break-words ${unchecked ? "text-muted" : "font-bold"}`}
              >
                {value}
              </dd>
            </div>
          ))}
          <div className="bg-notice px-5 py-3">
            <dt className="text-[0.889rem] font-medium text-subtle">
              보호자 연락처
            </dt>
            <dd className="flex flex-col items-start gap-2">
              <span
                className={`text-[1.222rem] break-words ${guardian ? "font-bold" : "text-muted"}`}
              >
                {guardian ? formatGuardian(guardian) : "등록된 연락처가 없어요"}
              </span>
              {telHref && (
                <a
                  href={telHref}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-4 font-bold text-white"
                >
                  <DesignIcon name="phone" size={20} />
                  전화
                </a>
              )}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
