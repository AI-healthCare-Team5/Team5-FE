import { Card } from "@/components/ui";

export function EmergencyHelp() {
  return (
    <Card className="border-[#fecdca] bg-emergency-soft">
      <h2 className="mb-2 font-bold text-emergency">
        몸 상태가 갑자기 나빠졌나요?
      </h2>
      <p className="mb-4 text-[0.889rem] text-muted">
        숨이 차거나, 의식이 흐려지는 등 위급한 증상이 있으면 바로 119에
        전화하세요.
      </p>
      <a
        href="tel:119"
        className="flex min-h-[max(44px,3.222rem)] items-center justify-center rounded-[12px] bg-emergency px-4 py-3 text-center font-bold text-white"
      >
        119에 전화하기
      </a>
    </Card>
  );
}
