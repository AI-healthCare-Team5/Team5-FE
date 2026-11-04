import { ScreenIcon } from "@/components/ScreenElements";
import { Notice } from "@/components/ui";

// 요청 실패나 처리하지 못한 일을 알리는 안내입니다. 문진·병원·요약지 화면이 함께 씁니다.
// 나타나면 스크린리더가 바로 읽도록 role="alert"를 둡니다.
export function WarningNotice({ children }: { children: string }) {
  return (
    <div role="alert">
      <Notice tone="amber">
        <span className="flex items-start gap-3">
          <ScreenIcon name="warning-amber" size={22} />
          <span className="min-w-0 break-words">{children}</span>
        </span>
      </Notice>
    </div>
  );
}
