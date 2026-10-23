import { EmergencyHelp } from "@/components/EmergencyHelp";
import { ActionLink, Notice, PageTitle } from "@/components/ui";

export function HospitalErrorPage() {
  return (
    <>
      <PageTitle
        eyebrow="병원 안내"
        description="병원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
      >
        병원 정보를
        <br />
        가져오지 못했어요
      </PageTitle>
      <ActionLink to="/hospitals">다시 시도</ActionLink>
      <ActionLink to="/summary" variant="outline">
        요약지 먼저 보기
      </ActionLink>
      <Notice>
        알려주신 내용은 그대로 있어요. 병원 안내를 기다리지 않고 진료 요약지를
        먼저 볼 수 있어요.
      </Notice>
      <EmergencyHelp />
      <ActionLink to="/" variant="quiet">
        처음으로
      </ActionLink>
    </>
  );
}
