import { useEffect, useState } from "react";
import type { Hospital } from "@/api/hospitals";
import { DesignIcon } from "@/components/DesignIcon";
import { ScreenIcon } from "@/components/ScreenElements";
import type { MapLocation } from "@/components/map/types";
import { Disclaimer, PageTitle } from "@/components/ui";
import { EmergencyRoomCard } from "@/pages/emergency/components/EmergencyRoomCard";
import { findEmergencyRooms } from "@/pages/emergency/emergencyRooms";
import { appActions, useAppStore } from "@/stores/appStore";

export function EmergencyPage() {
  const { emergency, currentLocation } = useAppStore();
  const location =
    currentLocation.status === "found" ? currentLocation.location : null;
  // 받은 응급실을 찾을 때 쓴 위치와 함께 둬서, 위치가 바뀌면 이전 결과를 보여 주지 않습니다.
  const [found, setFound] = useState<{
    location: MapLocation;
    rooms: Hospital[];
  } | null>(null);
  const rooms = found && found.location === location ? found.rooms : [];

  // 위치가 없으면 한 번만 묻습니다. 거부하면 119 안내만 남습니다.
  useEffect(() => {
    appActions.askCurrentLocationOnce();
  }, []);

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    void findEmergencyRooms(location, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setFound({ location, rooms: result });
      },
      (error: unknown) => {
        // 화면을 떠나 취소한 요청은 무시하고, 그 밖의 오류는 개발자 실수라 그대로 드러냅니다.
        if (!controller.signal.aborted) throw error;
      },
    );
    return () => controller.abort();
  }, [location]);

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
      {rooms.length > 0 && (
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
            {rooms.map((room) => (
              <EmergencyRoomCard key={room.hospitalId} room={room} />
            ))}
          </ol>
        </section>
      )}
      {/* 디자인의 "구급대원에게 보여줄 응급 카드"(E02) 링크는 #30에서 /emergency-card 경로가 생기면 이 자리에 둡니다. */}
      <div className="flex flex-col gap-3">
        <Disclaimer>
          정해진 위험 신호 기준에 따른 안내이며, 진단이 아니에요.
        </Disclaimer>
      </div>
    </div>
  );
}
