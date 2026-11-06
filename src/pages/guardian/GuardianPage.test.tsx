import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { GuardianPage } from "@/pages/guardian/GuardianPage";
import { appActions } from "@/stores/appStore";

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
    expect(markup).not.toContain('aria-describedby="guardian-save-hint"');
  });

  it("꺼진 저장하기는 빠진 항목 안내와 이어진다", () => {
    const markup = renderPage();

    expect(markup).toMatch(
      /<button[^>]*aria-describedby="guardian-save-hint"[^>]*>저장하기</,
    );
    expect(markup).toContain('id="guardian-save-hint"');
  });

  it("내 정보(P01)에서 지울 수 있다고 Figma 문구대로 안내한다", () => {
    const markup = renderPage();

    expect(markup).toContain("저장 위치와 보관 방식은 확정되는 대로 안내해요.");
    expect(markup).toContain("내 정보에서 지울 수 있어요.");
  });
});
