import { useNavigate } from "react-router";
import {
  IconList,
  Illustration,
  ScreenIcon,
} from "@/components/ScreenElements";
import { ActionLink, Button, PageTitle } from "@/components/ui";
export function LocationPage() {
  const navigate = useNavigate();
  return (
    <>
      <div className="flex flex-col gap-5">
        <Illustration>
          <ScreenIcon name="pin" size={44} />
        </Illustration>
        <PageTitle description="지금 있는 곳을 기준으로 가까운 순서로 병원을 안내해요. 위치를 허용하고 싶지 않으면 지역을 직접 고를 수 있어요.">
          가까운 병원을 찾으려면
          <br />내 위치가 필요해요
        </PageTitle>
      </div>
      <IconList
        items={[
          { icon: "shield", text: "위치는 병원 안내에 쓰여요" },
          {
            icon: "navigation",
            text: "가까운 순서로 진료 중인 병원을 보여드려요",
          },
          {
            icon: "write",
            text: "허용하고 싶지 않으면 지역을 직접 고를 수 있어요",
          },
        ]}
      />
      <div className="flex flex-col gap-3">
        <ActionLink to="/hospitals">
          <ScreenIcon name="pin-white" size={24} />
          위치 허용하고 병원 찾기
        </ActionLink>
        <ActionLink to="/region" variant="outline">
          지역을 직접 고를게요
        </ActionLink>
        <Button variant="quiet" onClick={() => navigate(-1)}>
          ← 이전으로
        </Button>
      </div>
    </>
  );
}
