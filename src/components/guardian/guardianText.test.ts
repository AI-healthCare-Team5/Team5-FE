import { describe, expect, it } from "vitest";
import { formatGuardian } from "@/components/guardian/guardianText";

// 모든 값은 가짜 데이터입니다.
describe("formatGuardian", () => {
  it("관계와 번호를 함께 보여 준다", () => {
    expect(
      formatGuardian({ relation: "DAUGHTER", phoneNumber: "010-0000-0000" }),
    ).toBe("딸 · 010-0000-0000");
    expect(
      formatGuardian({ relation: "ETC", phoneNumber: "010-1111-2222" }),
    ).toBe("가족 · 지인 · 010-1111-2222");
  });

  it("가린 번호는 서버가 준 모양 그대로 쓴다", () => {
    expect(
      formatGuardian({ relation: "SON", phoneNumber: "010-****-5678" }),
    ).toBe("아들 · 010-****-5678");
  });
});
