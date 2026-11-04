import { Button } from "@/components/ui";

export function InlineConfirm({
  message,
  onConfirm,
  onCancel,
  busy = false,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  // 확인한 요청이 진행 중이면 두 버튼을 잠가 이중 전송을 막습니다.
  busy?: boolean;
}) {
  return (
    <div
      className="space-y-3 rounded-[12px] border border-line bg-canvas p-4"
      role="group"
      aria-label="삭제 확인"
      aria-busy={busy}
    >
      <p role="status">{message}</p>
      <Button variant="outline" disabled={busy} onClick={onConfirm}>
        네, 지울게요
      </Button>
      <Button variant="quiet" disabled={busy} onClick={onCancel}>
        취소
      </Button>
    </div>
  );
}
