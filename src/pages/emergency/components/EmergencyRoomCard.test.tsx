import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Hospital } from "@/api/hospitals";
import { getDirectionsUrl } from "@/components/map/directions";
import { EmergencyRoomCard } from "@/pages/emergency/components/EmergencyRoomCard";

const room: Hospital = {
  hospitalId: 301,
  name: "OO병원 응급실",
  hospitalType: "11",
  hospitalTypeName: "종합병원",
  departments: [],
  distanceKm: 4.8,
  latitude: 37.7105,
  longitude: 127.9021,
  phoneNumber: "033-000-0000",
  address: "강원특별자치도 OO시 OO로 00",
  hasEmergencyRoom: true,
  today: {
    isOpen: true,
    is24Hours: true,
    openTime: "00:00",
    closeTime: "23:59",
    nextOpenAt: null,
  },
};

function render(value: Hospital, selected = false) {
  return renderToStaticMarkup(
    <EmergencyRoomCard
      cardId="emergency-card-301"
      room={value}
      rank={1}
      selected={selected}
      onSelect={() => undefined}
    />,
  );
}

describe("응급실 카드", () => {
  it("이름, 거리·24시간, 전화와 새 창 길 찾기 링크를 그린다", () => {
    const markup = render(room);

    expect(markup).toContain("OO병원 응급실");
    expect(markup).toContain("4.8km · 24시간");
    expect(markup).toContain('href="tel:033-000-0000"');
    expect(markup).toContain('aria-label="OO병원 응급실 전화"');
    expect(markup).toContain(
      `href="${getDirectionsUrl(room).replaceAll("&", "&amp;")}"`,
    );
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('aria-label="OO병원 응급실 길 찾기 (새 창)"');
  });

  it("24시간이 아니면 24시간이라고 적지 않는다", () => {
    const markup = render({
      ...room,
      today: room.today && { ...room.today, is24Hours: false },
    });

    expect(markup).toContain("4.8km");
    expect(markup).not.toContain("24시간");
  });

  it("전화번호가 없으면 전화 링크 없이 길 찾기만 그린다", () => {
    const markup = render({ ...room, phoneNumber: null });

    expect(markup).not.toContain("tel:");
    expect(markup).toContain("길 찾기");
  });

  it("지도 마커와 이어지는 ID와 번호, 선택 상태를 그린다", () => {
    const unselected = render(room);
    const selected = render(room, true);

    expect(unselected).toContain('id="emergency-card-301"');
    expect(unselected).toContain('aria-pressed="false"');
    expect(selected).toContain('aria-pressed="true"');
    expect(selected).toContain(">1</span>");
  });
});
