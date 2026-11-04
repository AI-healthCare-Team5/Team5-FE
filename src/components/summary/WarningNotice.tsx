import { ScreenIcon } from "@/components/ScreenElements";
import { Notice } from "@/components/ui";

// 요약지 화면(S06a, S06)이 요청 실패나 생성 실패를 알릴 때 쓰는 안내입니다.
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
