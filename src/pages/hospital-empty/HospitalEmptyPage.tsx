import { EmergencyHelp } from "@/components/EmergencyHelp";
import { ActionLink, Notice, PageTitle } from "@/components/ui";

export function HospitalEmptyPage() {
  return (
    <>
      <PageTitle
        eyebrow="병원 안내"
        description="반경 10km 안에서 안내할 병원을 찾지 못했어요. 범위를 넓히거나 다른 지역을 골라 주세요."
      >
        근처에 안내할
        <br />
        병원이 없어요
      </PageTitle>
      <ActionLink to="/hospitals?radius=30">30km로 넓혀 찾기</ActionLink>
      <ActionLink to="/region" variant="outline">
        지역 바꿔 찾기
      </ActionLink>
      <Notice>
        병원 정보가 아직 반영되지 않았을 수 있어요. 지역 보건소에도 문의할 수
        있어요.
      </Notice>
      <EmergencyHelp />
      <ActionLink to="/" variant="quiet">
        처음으로
      </ActionLink>
    </>
  );
}
