import { EmergencyHelp } from "@/components/EmergencyHelp";
import { DesignIcon } from "@/components/DesignIcon";
import { Illustration, ScreenIcon } from "@/components/ScreenElements";
import { ActionLink, Card, PageTitle } from "@/components/ui";
export function HospitalErrorPage() {
  return (
    <>
      <div className="flex flex-col gap-5">
        <Illustration amber>
          <img
            src="/images/screens/cloud-error.png"
            alt=""
            width={44}
            height={44}
          />
        </Illustration>
        <PageTitle description="공공 의료 정보를 가져오는 중에 문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.">
          병원 정보를
          <br />
          불러오지 못했어요
        </PageTitle>
      </div>
      <div className="flex flex-col gap-3">
        <ActionLink to="/hospitals">
          <ScreenIcon name="retry-white" size={24} />
          다시 시도
        </ActionLink>
        <ActionLink to="/summary" variant="outline">
          <ScreenIcon name="document" size={24} />
          요약지 먼저 보기
        </ActionLink>
      </div>
      <Card>
        <h2 className="mb-4 text-[1.111rem] font-bold">
          그동안 이렇게 해 보세요
        </h2>
        <ul className="mb-4 flex flex-col gap-[14px]">
          <li className="flex items-start gap-[14px] text-brand-strong">
            <DesignIcon name="phone" size={26} />
            <span className="text-ink">
              가까운 병원에 전화해서 진료 여부를 확인해요
            </span>
          </li>
          <li className="flex items-start gap-[14px]">
            <ScreenIcon name="document" />
            <span>요약지는 지금도 볼 수 있어요</span>
          </li>
        </ul>
        <EmergencyHelp />
      </Card>
      <ActionLink to="/" variant="quiet">
        처음으로
      </ActionLink>
    </>
  );
}
