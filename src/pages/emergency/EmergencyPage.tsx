import { useEffect, useState } from "react";
import type { HospitalSearchResult } from "@/api/hospitals";
import { DesignIcon } from "@/components/DesignIcon";
import { PublicDataNotice } from "@/components/PublicDataNotice";
import { ScreenIcon } from "@/components/ScreenElements";
import { WarningNotice } from "@/components/WarningNotice";
import { LOCATION_FAILED_MESSAGE } from "@/components/map/currentPosition";
import type { MapLocation } from "@/components/map/types";
import { ActionLink, Button, Disclaimer, PageTitle } from "@/components/ui";
import { EmergencyRoomCard } from "@/pages/emergency/components/EmergencyRoomCard";
import {
  findEmergencyRooms,
  locateWithoutPrompt,
} from "@/pages/emergency/emergencyRooms";
import { appActions, useAppStore } from "@/stores/appStore";

// 위치가 없을 때의 상태입니다.
// checking: 권한 창 없이 쓸 수 있는 위치를 찾는 중입니다. 버튼을 그리지 않습니다.
// manual: 권한 창 없이 받을 위치가 없습니다. "가까운 응급실 찾기"를 눌러야 묻습니다.
// asking: 눌러서 묻는 중입니다.
// failed: 눌러서 물었지만 받지 못했습니다. 안내와 함께 다시 누를 수 있습니다.
type Locating = "checking" | "manual" | "asking" | "failed";

export function EmergencyPage() {
  const { emergency, currentLocation: location } = useAppStore();
  const [locating, setLocating] = useState<Locating>("checking");
  // 받은 응급실을 찾을 때 쓴 위치와 함께 둬서, 위치가 바뀌면 이전 결과를 보여 주지 않습니다.
  const [found, setFound] = useState<{
    location: MapLocation;
    result: HospitalSearchResult | null;
  } | null>(null);
  const rooms = location && found?.location === location ? found.result : null;

  // 들어오자마자 권한 창을 띄우지 않습니다. 권한 창이 119 버튼을 가리지 않게 하려는 것입니다.
  useEffect(() => {
    let active = true;
    void locateWithoutPrompt().then((saved) => {
      if (active && !saved) setLocating("manual");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    void findEmergencyRooms(location, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setFound({ location, result });
      },
      (error: unknown) => {
        // 화면을 떠나 취소한 요청은 무시하고, 그 밖의 오류는 개발자 실수라 그대로 드러냅니다.
        if (!controller.signal.aborted) throw error;
      },
    );
    return () => controller.abort();
  }, [location]);

  async function findNearby() {
    setLocating("asking");
    const asked = await appActions.requestCurrentLocation();
    if (!asked) setLocating("failed");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-[14px] rounded-[24px] border border-emergency-line bg-emergency-soft p-6 text-emergency-ink">
        <span className="grid size-[56px] place-items-center rounded-full bg-emergency-line/50">
          <ScreenIcon name="warning-large" size={30} />
        </span>
        <p className="text-[0.889rem] font-bold">위험 신호를 감지했어요</p>
        <PageTitle description="문진을 멈췄어요. 119 안내에 따라 주세요.">
          지금 바로 119에 전화하세요
        </PageTitle>
      </section>
      <a
        href="tel:119"
        className="flex min-h-[max(44px,4.644rem)] items-center justify-center gap-3 rounded-[20px] bg-emergency px-5 py-4 text-center text-[1.222rem] font-bold text-white"
      >
        <DesignIcon name="phone" size={30} />
        119에 전화하기
      </a>
      {emergency?.userUtterance && (
        <section
          aria-labelledby="emergency-utterance"
          className="flex flex-col rounded-[20px] border border-line bg-surface px-5 py-4"
        >
          <h2
            id="emergency-utterance"
            className="text-[0.889rem] font-medium text-subtle"
          >
            말씀하신 내용
          </h2>
          <p className="text-[1.111rem] font-bold">
            “{emergency.userUtterance}”
          </p>
        </section>
      )}
      {!location && locating !== "checking" && (
        <div className="flex flex-col gap-3">
          {locating === "failed" && (
            <WarningNotice>{LOCATION_FAILED_MESSAGE}</WarningNotice>
          )}
          <Button
            variant="outline"
            disabled={locating === "asking"}
            aria-busy={locating === "asking"}
            onClick={() => void findNearby()}
          >
            가까운 응급실 찾기
          </Button>
        </div>
      )}
      {rooms && rooms.hospitals.length > 0 && (
        <section
          aria-labelledby="emergency-rooms"
          className="flex flex-col gap-3"
        >
          <h2
            id="emergency-rooms"
            className="text-[1.222rem] font-bold tracking-[-0.01em]"
          >
            가까운 응급실
          </h2>
          <ol className="flex flex-col gap-3">
            {rooms.hospitals.map((room) => (
              <EmergencyRoomCard key={room.hospitalId} room={room} />
            ))}
          </ol>
          <PublicDataNotice dataUpdatedAt={rooms.dataUpdatedAt} />
        </section>
      )}
      <div className="flex flex-col gap-3">
        <ActionLink to="/emergency-card">
          구급대원에게 보여줄 응급 카드
        </ActionLink>
        <Disclaimer>
          정해진 위험 신호 기준에 따른 안내이며, 진단이 아니에요.
        </Disclaimer>
      </div>
    </div>
  );
}
