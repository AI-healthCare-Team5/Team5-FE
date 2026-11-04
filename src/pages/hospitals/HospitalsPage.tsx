import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Card, PageTitle } from "@/components/ui";
import { HospitalResults } from "@/pages/hospitals/components/HospitalResults";
import {
  createHospitalsScreen,
  initialHospitalsView,
  type HospitalsExit,
  type HospitalsScreen,
} from "@/pages/hospitals/hospitalsScreen";
import {
  locationFailedState,
  parseHospitalQuery,
  withHospitalQuery,
} from "@/pages/hospitals/hospitalSearch";

// 문진이 끝나면 받은 추천 진료과(없으면 기억한 문진으로 다시 조회)와 현재 위치(또는 주소의 지역 코드)로 병원을 찾습니다.
// 조회와 이동은 hospitalsScreen.ts가 맡고, 화면을 떠나면 진행 중인 요청을 취소합니다.
export function HospitalsPage() {
  const [searchParams] = useSearchParams();
  const { radius, regionCode } = parseHospitalQuery(searchParams);
  const navigate = useNavigate();
  // 진료 시간 문구의 "오늘·내일"을 화면을 연 시각 기준으로 정합니다.
  const [now] = useState(() => new Date());
  const [view, setView] = useState(initialHospitalsView);
  const screenRef = useRef<HospitalsScreen | null>(null);

  useEffect(() => {
    const query = {
      ...(radius !== undefined ? { radius } : {}),
      ...(regionCode ? { regionCode } : {}),
    };
    const route = (exit: HospitalsExit) => {
      switch (exit.to) {
        case "start":
          navigate("/", { replace: true });
          return;
        case "location":
          navigate("/location", {
            replace: true,
            state: exit.locationFailed ? locationFailedState : undefined,
          });
          return;
        case "empty":
          navigate(withHospitalQuery("/hospital-empty", query), {
            replace: true,
          });
          return;
        case "error":
          navigate(withHospitalQuery("/hospital-error", query), {
            replace: true,
          });
          return;
      }
    };
    const screen = createHospitalsScreen(query, {
      onView: setView,
      onExit: route,
    });
    screenRef.current = screen;
    void screen.load();
    return () => {
      screen.dispose();
      screenRef.current = null;
    };
  }, [radius, regionCode, navigate]);

  const { phase, department, result, userLocation, message } = view;
  if (phase === "ready" && department && result) {
    return (
      <HospitalResults
        department={department}
        result={result}
        userLocation={userLocation}
        now={now}
      />
    );
  }
  if (phase === "error") {
    return (
      <>
        <PageTitle>병원을 찾지 못했어요</PageTitle>
        <WarningNotice>{message ?? ""}</WarningNotice>
        <div className="flex flex-col gap-3">
          <Button onClick={() => void screenRef.current?.load()}>
            다시 시도
          </Button>
          <ActionLink to="/" variant="quiet">
            처음으로
          </ActionLink>
        </div>
      </>
    );
  }
  return (
    <>
      <PageTitle>병원을 찾는 중이에요</PageTitle>
      <Card>
        <p role="status">가까운 병원을 찾고 있어요.</p>
      </Card>
    </>
  );
}
