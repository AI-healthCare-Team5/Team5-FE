import { useState } from "react";
import { Navigate } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";
import { HospitalMap } from "@/components/map/HospitalMap";
import { ActionLink, PageTitle } from "@/components/ui";
import { HospitalCard } from "@/pages/hospitals/components/HospitalCard";
import { sampleHospitalSearch } from "@/pages/hospitals/sampleHospitals";
import { formatRecordDate } from "@/pages/records/formatRecordDate";

// 추천 이유는 API가 만든 문장이라, 면책 문장은 화면에서 항상 붙입니다.
const disclaimer = "진단이 아니라 진료과 안내예요.";

export function HospitalsPage() {
  const search = sampleHospitalSearch;
  const [selectedId, setSelectedId] = useState<string>();
  // 고르기 전에는 지금 목록의 첫 병원을 선택한 것으로 봅니다.
  const activeId =
    selectedId ??
    (search.status === "ok" ? search.hospitals[0]?.id : undefined);
  if (search.status === "error") {
    return <Navigate to="/hospital-error" replace />;
  }
  if (search.hospitals.length === 0) {
    return <Navigate to="/hospital-empty" replace />;
  }
  return (
    <>
      <PageTitle
        eyebrow="추천 진료과"
        description={`${search.reason} ${disclaimer}`}
      >
        <span className="sr-only">추천 진료과 </span>
        {search.department}
      </PageTitle>
      <HospitalMap
        hospitals={search.hospitals}
        selectedHospitalId={activeId}
        userLocation={search.userLocation}
        onSelectHospital={setSelectedId}
      />
      <section aria-labelledby="hospitals-list" className="flex flex-col gap-4">
        <h2 id="hospitals-list" className="text-[1.222rem] font-bold">
          가까운 병원 {search.hospitals.length}곳
        </h2>
        <ol className="flex flex-col gap-3">
          {search.hospitals.map((hospital, index) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              rank={index + 1}
              selected={hospital.id === activeId}
              onSelect={() => setSelectedId(hospital.id)}
            />
          ))}
        </ol>
        <p className="flex items-start gap-[10px] rounded-[14px] bg-notice px-4 py-[14px] text-[0.889rem] text-notice-ink">
          <DesignIcon name="info" size={20} />
          <span>
            공공데이터 기준 · {formatRecordDate(search.dataUpdatedAt)} 갱신
            <br />
            가기 전에 전화로 진료 여부를 꼭 확인하세요.
          </span>
        </p>
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
