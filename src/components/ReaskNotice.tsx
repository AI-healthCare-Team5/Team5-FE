import { DesignIcon } from "@/components/DesignIcon";
import { Notice } from "@/components/ui";
import { REASK_MESSAGE } from "@/stores/intakeFlow";

// 서버가 못 알아듣고 같은 질문을 다시 물을 때(reask: true)와 음성 인식이 STT_422로 실패했을 때 보여 주는 안내입니다.
// 문구는 REASK_MESSAGE 한 곳에서만 정합니다.
// 안내가 나타날 때 스크린리더가 읽도록 항상 렌더링되는 role="status" 영역 안에 둡니다.
export function ReaskNotice({ show }: { show: boolean }) {
  return (
    <div role="status">
      {show && (
        <Notice tone="amber">
          <span className="flex items-start gap-3">
            <DesignIcon name="info" size={20} />
            <span>{REASK_MESSAGE}</span>
          </span>
        </Notice>
      )}
    </div>
  );
}
