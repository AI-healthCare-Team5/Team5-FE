import { describe, expect, it } from "vitest";
import { syncMarkerLabels } from "@/components/map/markerLabels";

function createMarker() {
  const attributes = new Map<string, string>();
  return {
    attributes,
    button: {
      setAttribute: (name: string, value: string) =>
        void attributes.set(name, value),
    },
  };
}

describe("지도 마커 읽기 이름", () => {
  it("이름만 바뀌어도 마커가 새 병원 이름을 읽는다", () => {
    const marker = createMarker();
    const markers = new Map([["h1", marker]]);
    syncMarkerLabels(markers, [{ id: "h1", name: "OO정형외과의원" }]);
    syncMarkerLabels(markers, [{ id: "h1", name: "OO정형외과" }]);
    expect(marker.attributes.get("aria-label")).toBe("OO정형외과 선택");
  });

  it("지도에 없는 병원은 건너뛴다", () => {
    const marker = createMarker();
    const markers = new Map([["h1", marker]]);
    syncMarkerLabels(markers, [
      { id: "h1", name: "가" },
      { id: "h2", name: "나" },
    ]);
    expect(marker.attributes.get("aria-label")).toBe("가 선택");
  });
});
