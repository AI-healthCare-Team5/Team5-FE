import { DesignIcon } from "@/components/DesignIcon";
import { ScreenIcon } from "@/components/ScreenElements";
import { Disclaimer, PageTitle } from "@/components/ui";
export function EmergencyPage() {
  return (
    <>
      <section className="flex flex-col gap-[14px] rounded-[24px] border border-emergency-line bg-emergency-soft p-6 text-emergency-ink">
        <span className="grid size-[56px] place-items-center rounded-full bg-emergency-line/50">
          <ScreenIcon name="warning-large" size={30} />
        </span>
        <p className="text-[0.889rem] font-bold">위험 신호를 감지했어요</p>
        <PageTitle description="문진을 멈췄어요. 119 안내에 따라 주세요.">
          지금 바로 119에 전화하세요
        </PageTitle>
      </section>
      <a
        href="tel:119"
        className="flex min-h-[max(44px,4.644rem)] items-center justify-center gap-3 rounded-[20px] bg-emergency px-5 py-4 text-center text-[1.222rem] font-bold text-white"
      >
        <DesignIcon name="phone" size={30} />
        119에 전화하기
      </a>
      <div className="flex flex-col gap-3">
        <Disclaimer>
          정해진 위험 신호 기준에 따른 안내이며, 진단이 아니에요.
        </Disclaimer>
      </div>
    </>
  );
}
