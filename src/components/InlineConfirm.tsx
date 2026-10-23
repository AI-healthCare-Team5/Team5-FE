import { Button } from "@/components/ui";

export function InlineConfirm({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="space-y-3 rounded-[12px] border border-line bg-canvas p-4"
      role="group"
      aria-label="삭제 확인"
    >
      <p role="status">{message}</p>
      <Button variant="outline" onClick={onConfirm}>
        네, 지울게요
      </Button>
      <Button variant="quiet" onClick={onCancel}>
        취소
      </Button>
    </div>
  );
}
