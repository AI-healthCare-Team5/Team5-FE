import { useState } from "react";
import type { HospitalSearchResult } from "@/api/hospitals";
import type { DepartmentRecommendation } from "@/api/intakes";
import { PublicDataNotice } from "@/components/PublicDataNotice";
import {
  hospitalCardId,
  resolveActiveId,
  revealCard,
} from "@/components/map/cardAnchor";
import { HospitalMap } from "@/components/map/HospitalMap";
import type { MapLocation } from "@/components/map/types";
import { ActionLink, PageTitle } from "@/components/ui";
import { HospitalCard } from "@/pages/hospitals/components/HospitalCard";

// 추천 이유는 API가 만든 문장이라, 면책 문장은 화면에서 항상 붙입니다.
// 지도 마커와 병원 카드를 잇는 ID 구분입니다.
const cardScope = "hospitals";
const disclaimer = "진단이 아니라 진료과 안내예요.";

// S05에서 병원을 1곳 이상 찾았을 때의 화면입니다. 찾는 일과 이동은 HospitalsPage가 맡습니다.
export function HospitalResults({
  department,
  result,
  userLocation,
  now,
}: {
  department: DepartmentRecommendation;
  // hospitals가 1곳 이상인 검색 결과입니다.
  result: HospitalSearchResult;
  // 현재 위치로 찾았을 때의 좌표입니다. 지역으로 찾았으면 없습니다.
  userLocation: MapLocation | null;
  // 진료 시간 문구의 "오늘·내일"을 정하는 기준 시각입니다.
  now: Date;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const { hospitals } = result;
  // 고르기 전에는 지금 목록의 첫 병원을 선택한 것으로 봅니다.
  const activeId = resolveActiveId(
    selectedId,
    hospitals.map((hospital) => hospital.hospitalId.toString()),
  );
  return (
    <>
      <PageTitle
        eyebrow="추천 진료과"
        description={`${department.recommendReason} ${disclaimer}`}
      >
        <span className="sr-only">추천 진료과 </span>
        {department.departmentName}
      </PageTitle>
      <HospitalMap
        hospitals={hospitals.map((hospital, index) => ({
          rank: index + 1,
          id: hospital.hospitalId.toString(),
          name: hospital.name,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
        }))}
        selectedHospitalId={activeId}
        userLocation={userLocation ?? undefined}
        onSelectHospital={(id) => {
          setSelectedId(id);
          revealCard(cardScope, id);
        }}
      />
      <section aria-labelledby="hospitals-list" className="flex flex-col gap-4">
        <h2 id="hospitals-list" className="text-[1.222rem] font-bold">
          가까운 병원 {hospitals.length}곳
        </h2>
        <ol className="flex flex-col gap-3">
          {hospitals.map((hospital, index) => {
            const id = hospital.hospitalId.toString();
            return (
              <HospitalCard
                key={id}
                cardId={hospitalCardId(cardScope, id)}
                hospital={hospital}
                departmentCode={department.departmentCode}
                now={now}
                rank={index + 1}
                selected={id === activeId}
                onSelect={() => setSelectedId(id)}
              />
            );
          })}
        </ol>
        <PublicDataNotice dataUpdatedAt={result.dataUpdatedAt} />
      </section>
      <div className="flex flex-col gap-3">
        <ActionLink to="/summary-loading">
          의사에게 보여줄 요약지 보기
        </ActionLink>
        <ActionLink to="/" variant="quiet">
          처음부터 다시 하기
        </ActionLink>
      </div>
    </>
  );
}
