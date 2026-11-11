import { describe, expect, it } from "vitest";
import {
  maxMapLevel,
  minMapLevel,
  nextMapLevel,
} from "@/components/map/mapLevel";

describe("nextMapLevel", () => {
  it("확대하면 단계를 줄이고 축소하면 늘린다", () => {
    expect(nextMapLevel(5, "in")).toBe(4);
    expect(nextMapLevel(5, "out")).toBe(6);
  });

  it("가장 가까운 단계와 가장 먼 단계를 넘지 않는다", () => {
    expect(nextMapLevel(minMapLevel, "in")).toBe(minMapLevel);
    expect(nextMapLevel(maxMapLevel, "out")).toBe(maxMapLevel);
  });
});
