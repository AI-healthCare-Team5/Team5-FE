import { useState } from "react";
import { Navigate } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";
import { HospitalMap } from "@/components/map/HospitalMap";
import { ActionLink, PageTitle } from "@/components/ui";
import { HospitalCard } from "@/pages/hospitals/components/HospitalCard";
import { hospitalOutcomePath } from "@/pages/hospitals/hospitalSearch";
import {
  createSampleHospitalSearch,
  sampleDepartment,
  sampleUserLocation,
} from "@/pages/hospitals/sampleHospitals";
import { formatRecordDate } from "@/pages/records/formatRecordDate";

// 추천 이유는 API가 만든 문장이라, 면책 문장은 화면에서 항상 붙입니다.
const disclaimer = "진단이 아니라 진료과 안내예요.";

// 문진·병원 API(#26)를 연결하기 전까지는 같은 모양의 가짜 응답을 씁니다.
export function HospitalsPage() {
  // 진료 시간 문구의 "오늘·내일"을 화면을 연 시각 기준으로 정합니다.
  const [now] = useState(() => new Date());
  const department = sampleDepartment;
  const [outcome] = useState(() => createSampleHospitalSearch(now));
  const [selectedId, setSelectedId] = useState<string>();
  const hospitals = outcome.kind === "found" ? outcome.result.hospitals : [];
  // 고르기 전에는 지금 목록의 첫 병원을 선택한 것으로 봅니다.
  const activeId = selectedId ?? hospitals[0]?.hospitalId.toString();
  const redirect = hospitalOutcomePath(outcome);
  if (redirect || outcome.kind !== "found") {
    return <Navigate to={redirect ?? "/hospital-error"} replace />;
  }
  const { result } = outcome;
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
        hospitals={hospitals.map((hospital) => ({
          id: hospital.hospitalId.toString(),
          name: hospital.name,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
        }))}
        selectedHospitalId={activeId}
        userLocation={sampleUserLocation}
        onSelectHospital={setSelectedId}
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
        <p className="flex items-start gap-[10px] rounded-[14px] bg-notice px-4 py-[14px] text-[0.889rem] text-notice-ink">
          <DesignIcon name="info" size={20} />
          <span>
            공공데이터 기준 · {formatRecordDate(result.dataUpdatedAt)} 갱신
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
