import { ActionLink, Disclaimer, Notice, PageTitle } from "@/components/ui";

export function EmergencyPage() {
  return (
    <>
      <span
        aria-hidden="true"
        className="grid h-[64px] w-[64px] place-items-center rounded-full bg-emergency-soft text-[32px] text-emergency"
      >
        !
      </span>
      <PageTitle description="위급할 수 있는 증상이 있어요. 혼자 이동하기보다 119에 먼저 도움을 요청해 주세요.">
        지금은 119의
        <br />
        도움이 필요해요
      </PageTitle>
      <a
        href="tel:119"
        className="flex min-h-[3.222rem] items-center justify-center rounded-[12px] bg-emergency px-4 py-3 text-center font-bold text-white"
      >
        119에 전화하기
      </a>
      <ActionLink to="/hospitals?emergency=true" variant="outline">
        가까운 응급실 찾기
      </ActionLink>
      <Notice tone="emergency">
        도움을 기다리는 동안 주변 분에게 함께 있어 달라고 부탁하세요.
      </Notice>
      <ActionLink to="/emergency-card" variant="outline">
        구급대원에게 보여줄 응급 카드
      </ActionLink>
      <Disclaimer>
        정해진 위험 신호 기준에 따른 안내이며, 진단이 아니에요.
      </Disclaimer>
    </>
  );
}
