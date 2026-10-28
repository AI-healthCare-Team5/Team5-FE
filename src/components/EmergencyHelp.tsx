import { DesignIcon } from "@/components/DesignIcon";
import { ScreenIcon } from "@/components/ScreenElements";
export function EmergencyHelp() {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-emergency-soft p-4">
      <p className="flex items-start gap-[10px] text-[0.889rem] text-emergency-ink">
        <ScreenIcon name="warning" size={22} />
        <span>증상이 갑자기 심해지면 바로 119에 전화하세요.</span>
      </p>
      <a
        href="tel:119"
        className="flex min-h-[max(44px,3.2rem)] items-center justify-center gap-[10px] rounded-[18px] border-2 border-emergency bg-surface px-4 py-3 text-center font-bold text-emergency"
      >
        <DesignIcon name="phone" size={24} />
        119에 전화하기
      </a>
    </div>
  );
}
