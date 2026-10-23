import { EmergencyHelp } from "@/components/EmergencyHelp";
import { ActionLink, Notice, PageTitle } from "@/components/ui";
export function HospitalEmptyPage() {
  return (
    <>
      <PageTitle
        eyebrow="검색 결과"
        description="반경 10km 안에 진료 중인 정형외과 정보가 없어요. 범위를 넓혀 다시 찾아볼 수 있어요."
      >
        가까운 곳에서 정형외과를 찾지 못했어요
      </PageTitle>
      <div className="flex flex-col gap-3">
        <ActionLink to="/hospitals?radius=30">30km까지 넓혀서 찾기</ActionLink>
        <Notice>
          병원 정보가 아직 반영되지 않았을 수 있어요. 지역 보건소에도 문의할 수
          있어요.
        </Notice>
        <EmergencyHelp />
        <ActionLink to="/region" variant="quiet">
          지역을 바꿔서 찾기
        </ActionLink>
      </div>
    </>
  );
}
