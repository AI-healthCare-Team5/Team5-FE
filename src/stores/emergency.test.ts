import { describe, expect, it } from "vitest";
import type { IntakeStatus } from "@/api/enums";
import { toEmergencyEntry } from "@/stores/emergency";

const intakeId = "3f2a9c1e-0000-4000-8000-000000000001";
const emergency = {
  userUtterance: "가슴이 답답해요",
  redFlagCategory: "CHEST_PAIN" as const,
};

describe("응급 전환 정보", () => {
  it("EMERGENCY 응답이면 문진 ID와 말씀하신 내용을 돌려준다", () => {
    expect(
      toEmergencyEntry({ intakeId, status: "EMERGENCY", emergency }),
    ).toEqual({ intakeId, userUtterance: "가슴이 답답해요" });
  });

  it("말씀하신 내용의 앞뒤 공백을 지운다", () => {
    expect(
      toEmergencyEntry({
        intakeId,
        status: "EMERGENCY",
        emergency: { ...emergency, userUtterance: "  가슴이 답답해요 " },
      })?.userUtterance,
    ).toBe("가슴이 답답해요");
  });

  it.each([
    ["emergency가 null", null],
    ["말씀하신 내용이 빈 글자", { ...emergency, userUtterance: " " }],
  ])("%s이어도 전환하고 말씀하신 내용은 null이다", (_name, value) => {
    expect(
      toEmergencyEntry({ intakeId, status: "EMERGENCY", emergency: value }),
    ).toEqual({ intakeId, userUtterance: null });
  });

  it.each<IntakeStatus>(["IN_PROGRESS", "COMPLETED", "CANCELED"])(
    "%s 응답이면 null이다",
    (status) => {
      expect(toEmergencyEntry({ intakeId, status, emergency })).toBeNull();
    },
  );
});
