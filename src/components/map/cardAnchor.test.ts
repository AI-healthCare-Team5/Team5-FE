import { describe, expect, it } from "vitest";
import {
  hospitalCardId,
  isMapPoint,
  resolveActiveId,
} from "@/components/map/cardAnchor";

describe("hospitalCardId", () => {
  it("화면 구분과 병원 ID로 카드마다 다른 ID를 만든다", () => {
    expect(hospitalCardId("hospitals", "1")).toBe("hospitals-card-1");
    expect(hospitalCardId("hospitals", "1")).not.toBe(
      hospitalCardId("hospitals", "2"),
    );
    expect(hospitalCardId("emergency", "1")).not.toBe(
      hospitalCardId("hospitals", "1"),
    );
  });
});

describe("resolveActiveId", () => {
  it("목록에 있는 선택은 유지하고, 없거나 비었으면 첫 항목으로 본다", () => {
    expect(resolveActiveId("2", ["1", "2"])).toBe("2");
    expect(resolveActiveId(undefined, ["1", "2"])).toBe("1");
    expect(resolveActiveId("9", ["1", "2"])).toBe("1");
    expect(resolveActiveId("9", [])).toBeUndefined();
  });
});

describe("isMapPoint", () => {
  it("유한하고 범위 안인 좌표만 지도에 그린다", () => {
    expect(isMapPoint({ latitude: 37.7, longitude: 127.9 })).toBe(true);
    expect(isMapPoint({ latitude: Number.NaN, longitude: 127.9 })).toBe(false);
    expect(isMapPoint({ latitude: 37.7, longitude: Infinity })).toBe(false);
    expect(isMapPoint({ latitude: 91, longitude: 127.9 })).toBe(false);
  });
});
