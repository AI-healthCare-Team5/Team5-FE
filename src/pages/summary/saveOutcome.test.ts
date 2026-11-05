import { describe, expect, it } from "vitest";
import { actionForSaveOutcome } from "@/pages/summary/saveOutcome";

describe("보관 결과에 따른 S06의 동작", () => {
  it("보관했으면 기록 상세(H02)로 보내고, 지워진 요약지 화면에 뒤로 가기로 돌아오지 않게 대체한다", () => {
    expect(
      actionForSaveOutcome({
        kind: "saved",
        medicalRecordId: 12,
        alreadySaved: false,
      }),
    ).toEqual({
      kind: "navigate",
      to: "/records/12",
      replace: true,
      resumeSave: false,
    });
  });

  it("이미 보관한 요약지(SUMMARY_409와 기록 ID)도 같은 기록 상세로 보낸다", () => {
    expect(
      actionForSaveOutcome({
        kind: "saved",
        medicalRecordId: 7,
        alreadySaved: true,
      }),
    ).toMatchObject({ to: "/records/7", replace: true });
  });

  it("동의나 로그인이 필요하면 돌아와 보관을 이어 가도록 기억하고 해당 화면으로 보낸다", () => {
    expect(actionForSaveOutcome({ kind: "needsConsent" })).toEqual({
      kind: "navigate",
      to: "/record-consent",
      replace: false,
      resumeSave: true,
    });
    expect(actionForSaveOutcome({ kind: "needsLogin" })).toEqual({
      kind: "navigate",
      to: "/login",
      replace: false,
      resumeSave: true,
    });
  });

  it("요약지가 아직 만들어지는 중이면 만드는 중 화면으로, 없어졌으면 처음으로 보낸다", () => {
    expect(actionForSaveOutcome({ kind: "notReady" })).toEqual({
      kind: "navigate",
      to: "/summary-loading",
      replace: true,
      resumeSave: false,
    });
    expect(actionForSaveOutcome({ kind: "gone" })).toEqual({
      kind: "navigate",
      to: "/",
      replace: true,
      resumeSave: false,
    });
  });

  it("보관하지 못했으면 이동하지 않고 안내만 한다", () => {
    expect(
      actionForSaveOutcome({ kind: "failed", message: "다시 시도해 주세요." }),
    ).toEqual({ kind: "message", message: "다시 시도해 주세요." });
  });
});
