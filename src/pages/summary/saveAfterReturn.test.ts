import { describe, expect, it } from "vitest";
import { isSavePending } from "@/pages/summary/saveAfterReturn";

// 모든 값은 가짜 데이터입니다.
const session = { intakeId: "intake-1", summaryId: "summary-1" };
const ready = {
  loggedIn: true,
  recordConsent: true,
  summarySaved: false,
  saveTarget: { ...session },
};

describe("로그인·동의 뒤 보관", () => {
  it("보관하러 나갔던 요약지로 돌아왔고 로그인·동의가 끝났으면 보관한다", () => {
    expect(isSavePending(ready, session)).toBe(true);
  });

  it.each([
    ["로그인하지 않았으면", { loggedIn: false }],
    ["동의하지 않았으면", { recordConsent: false }],
    ["이미 보관했으면", { summarySaved: true }],
    ["보관하러 나간 적이 없으면", { saveTarget: null }],
    [
      "다른 요약지를 보관하러 나갔으면",
      { saveTarget: { intakeId: "intake-1", summaryId: "summary-2" } },
    ],
    [
      "다른 문진의 요약지를 보관하러 나갔으면",
      { saveTarget: { intakeId: "intake-2", summaryId: "summary-1" } },
    ],
  ])("%s 보관하지 않는다", (_name, patch) => {
    expect(isSavePending({ ...ready, ...patch }, session)).toBe(false);
  });
});
