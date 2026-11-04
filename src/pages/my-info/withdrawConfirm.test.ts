import { describe, expect, it } from "vitest";
import { WITHDRAW_CONFIRM_MESSAGE } from "@/pages/my-info/withdrawConfirm";

describe("탈퇴 확인 문구", () => {
  it("탈퇴로 함께 지워지는 기록과 보호자 연락처, 거두어지는 동의를 모두 알린다", () => {
    expect(WITHDRAW_CONFIRM_MESSAGE).toContain("기록");
    expect(WITHDRAW_CONFIRM_MESSAGE).toContain("보호자 연락처");
    expect(WITHDRAW_CONFIRM_MESSAGE).toContain("동의");
  });

  it("저장 위치나 보관 기간처럼 확정되지 않은 정책은 단정하지 않는다", () => {
    expect(WITHDRAW_CONFIRM_MESSAGE).not.toMatch(/30일|서버|이 기기|암호/);
  });
});
