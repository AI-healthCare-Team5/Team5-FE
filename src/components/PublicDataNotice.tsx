import { DesignIcon } from "@/components/DesignIcon";
import { formatRecordDate } from "@/pages/records/formatRecordDate";

// 공공데이터로 찾은 병원·응급실 목록 아래에 붙이는 갱신일·전화 확인 안내입니다(S05, E01).
// 진료 상태와 병상은 실시간이 아니어서, 가기 전에 전화로 확인하도록 함께 안내합니다.
export function PublicDataNotice({ dataUpdatedAt }: { dataUpdatedAt: string }) {
  return (
    <p className="flex items-start gap-[10px] rounded-[14px] bg-notice px-4 py-[14px] text-[0.889rem] text-notice-ink">
      <DesignIcon name="info" size={20} />
      <span>
        공공데이터 기준 · {formatRecordDate(dataUpdatedAt)} 갱신
        <br />
        가기 전에 전화로 진료 여부를 꼭 확인하세요.
      </span>
    </p>
  );
}
