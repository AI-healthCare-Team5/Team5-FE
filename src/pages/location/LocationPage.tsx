import { useNavigate } from "react-router";
import { ActionLink, Button, PageTitle } from "@/components/ui";

export function LocationPage() {
  const navigate = useNavigate();
  return (
    <>
      <span
        aria-hidden="true"
        className="grid h-[64px] w-[64px] place-items-center rounded-full bg-brand-soft text-[32px] text-brand"
      >
        ⌾
      </span>
      <PageTitle description="지금 있는 곳을 기준으로 가까운 병원을 안내해요. 위치를 허용하지 않아도 지역을 직접 골라 병원을 찾을 수 있어요.">
        가까운 병원을 찾으려면
        <br />내 위치가 필요해요
      </PageTitle>
      <ul className="space-y-4 text-[0.889rem] text-muted">
        <li>⌾ 위치는 병원 안내에 쓰여요.</li>
        <li>⌾ 거리는 실제 이동 경로와 다를 수 있어요.</li>
        <li>⌾ 위치를 알려주지 않아도 지역을 직접 고를 수 있어요.</li>
      </ul>
      <ActionLink to="/hospitals">위치 허용하고 병원 찾기</ActionLink>
      <ActionLink to="/region" variant="outline">
        지역을 직접 고를게요
      </ActionLink>
      <Button variant="quiet" onClick={() => navigate(-1)}>
        ← 이전으로
      </Button>
    </>
  );
}
