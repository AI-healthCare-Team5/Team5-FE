import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { GuardianConsentPage } from "@/pages/guardian-consent/GuardianConsentPage";

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/guardian-consent?from=my-info"]}>
      <GuardianConsentPage />
    </MemoryRouter>,
  );
}

describe("GuardianConsentPage", () => {
  it("저장 위치는 정해진 문구로 알리고, 확정 전이라는 문구는 쓰지 않는다", () => {
    const markup = renderPage();

    expect(markup).toContain("어디에, 얼마나 저장하나요?");
    expect(markup).toContain(
      "진료한장 서버 DB에 저장하고, 직접 지우거나 탈퇴할 때까지 보관해요.",
    );
    expect(markup).not.toContain("확정되면 이곳에 안내해요");
  });

  it("내 정보에서 들어오면 내 정보로 돌아간다", () => {
    expect(renderPage()).toContain('href="/my-info"');
  });
});
