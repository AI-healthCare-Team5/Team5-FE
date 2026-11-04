import { beforeEach, describe, expect, it } from "vitest";
import type { MemberInfo } from "@/api/members";
import { appActions, getAppState } from "@/stores/appStore";

// 모든 값은 가짜 데이터입니다.
const intent = { returnTo: "/summary", saveTarget: null };

const info: MemberInfo = {
  memberId: 1,
  nickname: null,
  provider: "KAKAO",
  consents: {
    record: { agreed: true, policyVersion: "v1", agreedAt: "2026-11-04" },
    guardian: { agreed: true, policyVersion: "v1", agreedAt: "2026-11-04" },
  },
  recordCount: 3,
  guardian: { relation: "DAUGHTER", phoneNumber: "010-****-5678" },
};

beforeEach(() => {
  appActions.logout();
});

describe("로그인 상태", () => {
  it("카카오 로그인 응답으로 로그인하고 닉네임이 없으면 빈 문자열이다", () => {
    appActions.completeLogin(
      { nickname: null, needsRecordConsent: true },
      intent,
    );

    expect(getAppState()).toMatchObject({
      loggedIn: true,
      nickname: "",
      recordConsent: false,
    });
  });

  it("로그인해도 기록과 보호자를 지어내지 않는다", () => {
    appActions.completeLogin(
      { nickname: "봄날", needsRecordConsent: false },
      intent,
    );

    expect(getAppState()).toMatchObject({
      recordConsent: true,
      guardian: null,
      guardianConsent: false,
      recordCount: 0,
    });
  });

  it("내 정보 응답으로 동의와 보호자, 기록 수를 서버 값 그대로 반영한다", () => {
    appActions.applyMember(info);

    expect(getAppState()).toMatchObject({
      loggedIn: true,
      recordConsent: true,
      guardianConsent: true,
      recordCount: 3,
      guardian: { relation: "DAUGHTER", phoneNumber: "010-****-5678" },
    });
  });

  it("로그인이 풀리면 계정 값을 비우되 보관하려던 요약지 기억은 남긴다", () => {
    const saveTarget = { intakeId: "intake-1", summaryId: "summary-1" };
    appActions.completeLogin(
      { nickname: "봄날", needsRecordConsent: false },
      { returnTo: "/summary", saveTarget },
    );
    appActions.applyMember(info);

    appActions.markLoggedOut();

    expect(getAppState()).toMatchObject({
      loggedIn: false,
      nickname: "",
      recordConsent: false,
      guardian: null,
      recordCount: 0,
      returnTo: "/summary",
      saveTarget,
    });
  });

  it("로그아웃과 탈퇴는 보관하려던 요약지 기억과 보관 표시도 지운다", () => {
    for (const action of [appActions.logout, appActions.withdraw]) {
      appActions.completeLogin(
        { nickname: "봄날", needsRecordConsent: false },
        {
          returnTo: "/summary",
          saveTarget: { intakeId: "i", summaryId: "s" },
        },
      );
      appActions.markSummarySaved();

      action();

      expect(getAppState()).toMatchObject({
        loggedIn: false,
        saveTarget: null,
        summarySaved: false,
        returnTo: "/records",
      });
    }
  });
});

describe("동의와 보관 표시", () => {
  it("로그인하지 않았으면 동의했다고 바꾸지 않는다", () => {
    appActions.agreeToRecords();

    expect(getAppState().recordConsent).toBe(false);
  });

  it("서버가 CONSENT_403이라고 하면 동의가 없는 것으로 되돌린다", () => {
    appActions.completeLogin(
      { nickname: "봄날", needsRecordConsent: false },
      intent,
    );

    appActions.revokeRecordConsent();

    expect(getAppState().recordConsent).toBe(false);
  });

  it("흐름을 처음부터 다시 시작하면 보관 표시가 사라진다", () => {
    appActions.markSummarySaved();
    expect(getAppState().summarySaved).toBe(true);

    appActions.startInterview();

    expect(getAppState().summarySaved).toBe(false);
  });

  it("보호자를 등록하면 동의한 것으로, 지우면 철회된 것으로 반영한다", () => {
    appActions.setGuardian({ relation: "SON", phoneNumber: "010-****-1111" });
    expect(getAppState()).toMatchObject({
      guardianConsent: true,
      guardian: { relation: "SON" },
    });

    appActions.setGuardian(null);

    expect(getAppState()).toMatchObject({
      guardianConsent: false,
      guardian: null,
    });
  });
});
