import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { Hospital } from "@/api/hospitals";
import { EmergencyHelp } from "@/components/EmergencyHelp";
import { ActionLink, Notice, PageTitle } from "@/components/ui";
import { HealthCenterCard } from "@/pages/hospital-empty/components/HealthCenterCard";
import { loadNearestHealthCenter } from "@/pages/hospitals/healthCenter";
import {
  effectiveRadius,
  HOSPITAL_RADIUS_EXPANDED_KM,
  parseHospitalQuery,
  withHospitalQuery,
} from "@/pages/hospitals/hospitalSearch";

// S05(병원 안내)가 반경 안에서 병원을 찾지 못하면 이 화면으로 보냅니다.
// 어떤 조건으로 찾았는지는 주소(radius, regionCode)로 받아서, 새로고침해도 같은 안내가 이어집니다.
export function HospitalEmptyPage() {
  const [searchParams] = useSearchParams();
  const query = parseHospitalQuery(searchParams);
  const radius = effectiveRadius(query);
  // 가장 넓은 반경까지 찾았다면 더 넓힐 수 없어서 넓히는 버튼을 두지 않습니다.
  const canExpand = radius < HOSPITAL_RADIUS_EXPANDED_KM;
  const { regionCode } = query;
  const [healthCenter, setHealthCenter] = useState<Hospital | null>(null);

  // 가까운 보건소는 곁들이는 안내라서, 못 찾으면 카드만 그리지 않습니다.
  useEffect(() => {
    const request = new AbortController();
    void loadNearestHealthCenter(
      regionCode ? { regionCode } : {},
      request.signal,
    ).then((found) => {
      if (!request.signal.aborted) setHealthCenter(found);
    });
    return () => request.abort();
  }, [regionCode]);

  return (
    <>
      <PageTitle
        eyebrow="검색 결과"
        description={`반경 ${radius}km 안에 안내할 병원 정보가 없어요.${canExpand ? " 범위를 넓혀 다시 찾아볼 수 있어요." : ""}`}
      >
        가까운 곳에서 병원을 찾지 못했어요
      </PageTitle>
      <div className="flex flex-col gap-3">
        {canExpand && (
          <ActionLink
            to={withHospitalQuery("/hospitals", {
              ...query,
              radius: HOSPITAL_RADIUS_EXPANDED_KM,
            })}
          >
            {HOSPITAL_RADIUS_EXPANDED_KM}km까지 넓혀서 찾기
          </ActionLink>
        )}
        {healthCenter && <HealthCenterCard hospital={healthCenter} />}
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
