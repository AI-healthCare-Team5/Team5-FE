import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HospitalCard } from "@/pages/hospitals/components/HospitalCard";
import type { Hospital } from "@/pages/hospitals/types";

const now = new Date("2026-11-04T15:00:00+09:00");

const hospital: Hospital = {
  hospitalId: 1,
  name: "OO의원",
  hospitalType: "31",
  hospitalTypeName: "의원",
  departments: [{ departmentCode: "05", departmentName: "정형외과" }],
  distanceKm: 1.25,
  latitude: 37.88,
  longitude: 127.73,
  phoneNumber: "000-0000-0000",
  address: "강원특별자치도 OO시 OO로 00",
  hasEmergencyRoom: false,
  today: {
    isOpen: true,
    is24Hours: false,
    openTime: "09:00",
    closeTime: "18:00",
    nextOpenAt: null,
  },
};

function render(item: Hospital, departmentCode = "05") {
  return renderToStaticMarkup(
    <HospitalCard
      hospital={item}
      departmentCode={departmentCode}
      now={now}
      rank={2}
      selected={false}
      onSelect={() => {}}
    />,
  );
}

describe("HospitalCard", () => {
  it("추천 진료과 이름·거리·오늘 진료 시간·전화를 보여 준다", () => {
    const markup = render(hospital);

    expect(markup).toContain("정형외과 · 1.3km");
    expect(markup).toContain("오늘 18:00까지 진료");
    expect(markup).toContain('href="tel:000-0000-0000"');
  });

  it("병원에 추천 진료과가 없으면 종별 이름을 보여 준다", () => {
    expect(render(hospital, "01")).toContain("의원 · 1.3km");
  });

  it("전화번호가 없으면 전화 버튼을, 진료 시간 정보가 없으면 시간 줄을 빼고 길 찾기는 남긴다", () => {
    const markup = render({ ...hospital, phoneNumber: null, today: null });

    expect(markup).not.toContain("tel:");
    expect(markup).not.toContain("까지 진료");
    expect(markup).toContain("OO의원 길 찾기 (새 창)");
  });
});
