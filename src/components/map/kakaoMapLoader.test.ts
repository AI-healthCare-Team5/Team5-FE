import { describe, expect, it } from "vitest";
import { getKakaoMapSdkUrl } from "@/components/map/kakaoMapLoader";

describe("카카오맵 SDK 주소", () => {
  it("지도를 직접 초기화할 수 있게 자동 로드를 끈다", () => {
    expect(getKakaoMapSdkUrl("abc")).toBe(
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=abc&autoload=false",
    );
  });
  it("앱 키를 주소에 안전하게 넣는다", () => {
    expect(getKakaoMapSdkUrl("a&b")).toContain("appkey=a%26b&");
  });
});
