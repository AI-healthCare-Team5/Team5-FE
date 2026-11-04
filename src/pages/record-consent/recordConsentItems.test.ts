import { describe, expect, it } from "vitest";
import { recordConsentItems } from "@/pages/record-consent/recordConsentItems";

const answerOf = (title: string) =>
  recordConsentItems.find(([name]) => name === title)?.[1];

describe("C02 기록 저장 동의 문구", () => {
  it("동의를 거두는 방법은 서버가 철회하는 탈퇴만 말하고 기록 삭제로는 철회된다고 하지 않는다", () => {
    const text = answerOf("동의를 거두려면요?");

    expect(text).toContain("탈퇴");
    expect(text).not.toContain("지우면");
  });

  it("저장 위치와 보관 기간을 단정하지 않는다", () => {
    const text = answerOf("어디에, 얼마나 저장하나요?");

    expect(text).toContain("정책이 확정되면");
    for (const claim of ["암호화", "30일", "완전히", "서버에 저장"]) {
      expect(text).not.toContain(claim);
    }
  });

  it("모든 항목에 문구가 있다", () => {
    expect(recordConsentItems.length).toBeGreaterThan(0);
    for (const [title, text] of recordConsentItems) {
      expect(title).not.toBe("");
      expect(text).not.toBe("");
    }
  });
});
