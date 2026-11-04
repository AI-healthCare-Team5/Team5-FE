import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { GuardianPage } from "@/pages/guardian/GuardianPage";
import { appActions, getAppState } from "@/stores/appStore";

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <GuardianPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  appActions.clearGuardianDraft();
});

describe("GuardianPage", () => {
  it("처음에는 저장하기가 꺼져 있고 빠진 항목을 모두 안내한다", () => {
    const markup = renderPage();

    expect(markup).toContain("보호자 연락처를");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>저장하기</);
    expect(markup).toContain("관계, 전화번호, 동의를 확인해 주세요");
    expect(markup).toContain('href="/guardian-consent?from=guardian"');
    expect(markup).toContain('placeholder="010-0000-0000"');
  });

  it("입력 중인 값을 그대로 보여 주고, 다 채우면 저장하기가 켜진다", () => {
    appActions.editGuardianDraft({
      relation: "ETC",
      phoneNumber: "01000000000",
      consentAgreed: true,
    });
    const markup = renderPage();

    expect(markup).toMatch(/aria-pressed="true"[^>]*>가족 · 지인</);
    expect(markup).toContain('value="01000000000"');
    expect(markup).toMatch(/type="checkbox"[^>]*checked=""/);
    expect(markup).not.toMatch(/disabled=""[^>]*>저장하기</);
    expect(markup).not.toContain("확인해 주세요");
  });

  it("로그아웃하면 입력 중인 보호자 연락처를 지운다", () => {
    appActions.editGuardianDraft({ phoneNumber: "01000000000" });
    appActions.logout();

    expect(getAppState().guardianDraft.phoneNumber).toBe("");
  });
});
