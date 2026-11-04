import { describe, expect, it } from "vitest";
import { getDirectionsUrl } from "@/components/map/directions";

describe("길 찾기 링크", () => {
  it("이름, 위도, 경도 순서로 카카오맵 길 찾기 주소를 만든다", () => {
    expect(
      getDirectionsUrl({
        name: "OO병원",
        latitude: 37.7105,
        longitude: 127.9021,
      }),
    ).toBe(
      `https://map.kakao.com/link/to/${encodeURIComponent("OO병원")},37.7105,127.9021`,
    );
  });

  it("이름의 쉼표와 빈칸을 주소에 안전하게 넣는다", () => {
    expect(
      getDirectionsUrl({ name: "△△병원, 응급실", latitude: 1, longitude: 2 }),
    ).toBe(
      "https://map.kakao.com/link/to/%E2%96%B3%E2%96%B3%EB%B3%91%EC%9B%90%2C%20%EC%9D%91%EA%B8%89%EC%8B%A4,1,2",
    );
  });
});
