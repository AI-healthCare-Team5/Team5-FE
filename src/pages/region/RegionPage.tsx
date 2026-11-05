import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { Region } from "@/api/regions";
import { ScreenIcon } from "@/components/ScreenElements";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Chip, Notice, PageTitle } from "@/components/ui";
import {
  isLocationFailed,
  withHospitalQuery,
} from "@/pages/hospitals/hospitalSearch";
import {
  loadRegions,
  selectedRegion,
  type RegionLoad,
} from "@/pages/region/regionChoice";

// S05b 지역 선택입니다. 고른 시·군의 regionCode로 병원 안내(S05)를 엽니다.
// 위치 확인(S05a)에서 "지역을 직접 고를게요"나 근처 병원 없음(S05c)에서 "지역을 바꿔서 찾기"로 들어옵니다.
export function RegionPage() {
  const navigate = useNavigate();
  // 위치를 얻지 못해 넘어온 경우에만 Figma의 "위치를 확인하지 못했어요" 안내를 보여 줍니다.
  // 사용자가 직접 지역을 고르기로 한 경우에는 사실이 아니므로 보여 주지 않습니다.
  const locationFailed = isLocationFailed(useLocation().state);
  const [load, setLoad] = useState<RegionLoad | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const regions: Region[] = load?.kind === "loaded" ? load.regions : [];
  const selected = selectedRegion(regions, chosenCode);

  useEffect(() => {
    let active = true;
    void loadRegions().then((next) => {
      if (active) setLoad(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setLoad(null);
    setAttempt((value) => value + 1);
  }

  return (
    <>
      {locationFailed && (
        <Notice tone="amber">
          <span className="flex items-start gap-3">
            <ScreenIcon name="warning-amber" size={22} />
            <span className="flex flex-col">
              <strong>위치를 확인하지 못했어요</strong>
              위치 사용이 허용되지 않았거나 지금은 확인할 수 없어요.
            </span>
          </span>
        </Notice>
      )}
      <PageTitle description="계신 곳의 시·군을 골라 주세요. 그 지역의 병원을 안내해 드려요.">
        어느 지역에서
        <br />
        찾을까요?
      </PageTitle>
      <section
        aria-labelledby="region-list"
        aria-busy={load === null}
        className="flex flex-col gap-3 break-keep"
      >
        <h2 id="region-list" className="text-[1.111rem] font-bold">
          강원특별자치도 <span className="whitespace-nowrap">시·군</span>
        </h2>
        {load === null && (
          <p role="status" className="text-muted">
            시·군 목록을 불러오는 중이에요.
          </p>
        )}
        {load?.kind === "failed" && (
          <div className="flex flex-col gap-3">
            <WarningNotice>{load.message}</WarningNotice>
            <Button variant="outline" onClick={retry}>
              다시 시도
            </Button>
          </div>
        )}
        {regions.length > 0 && (
          // 보통 글자에서는 Figma처럼 3열이고, 글자를 키우면 시·군 이름이 한 줄에 들어가도록 열 수를 줄입니다.
          <div
            role="group"
            aria-labelledby="region-list"
            className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-[10px]"
          >
            {regions.map((region) => (
              <Chip
                key={region.regionCode}
                selected={selected?.regionCode === region.regionCode}
                onClick={() => setChosenCode(region.regionCode)}
              >
                {region.regionName}
              </Chip>
            ))}
          </div>
        )}
      </section>
      <div className="flex flex-col gap-3">
        {selected && (
          <Button
            onClick={() =>
              navigate(
                withHospitalQuery("/hospitals", {
                  regionCode: selected.regionCode,
                }),
              )
            }
          >
            {selected.regionName} 병원 찾기
          </Button>
        )}
        <ActionLink to="/location" variant="outline">
          내 위치로 다시 시도
        </ActionLink>
      </div>
    </>
  );
}
