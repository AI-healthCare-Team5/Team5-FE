import { DesignIcon } from "@/components/DesignIcon";
import { Notice } from "@/components/ui";

// 서버가 못 알아듣고 같은 질문을 다시 물을 때(reask: true) 보여 주는 안내입니다.
// 안내가 나타날 때 스크린리더가 읽도록 항상 렌더링되는 role="status" 영역 안에 둡니다.
export function ReaskNotice({ show }: { show: boolean }) {
  return (
    <div role="status">
      {show && (
        <Notice tone="amber">
          <span className="flex items-start gap-3">
            <DesignIcon name="info" size={20} />
            <span>다시 말씀해 주세요</span>
          </span>
        </Notice>
      )}
    </div>
  );
}
