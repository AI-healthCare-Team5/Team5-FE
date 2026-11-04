import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { EmergencyPage } from "@/pages/emergency/EmergencyPage";
import { appActions } from "@/stores/appStore";

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EmergencyPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  appActions.startInterview();
});

describe("EmergencyPage", () => {
  it("경고, 119 전화, 면책을 그리고 E02 경로가 없어 응급 카드 링크는 숨긴다", () => {
    const markup = renderPage();

    expect(markup).toContain("위험 신호를 감지했어요");
    expect(markup).toContain('href="tel:119"');
    expect(markup).toContain(
      "정해진 위험 신호 기준에 따른 안내이며, 진단이 아니에요.",
    );
    expect(markup).not.toContain("/emergency-card");
    expect(markup).not.toContain("구급대원에게 보여줄 응급 카드");
  });

  it("응급 전환으로 들어오면 말씀하신 내용을 따옴표로 보여 준다", () => {
    appActions.enterEmergency({
      intakeId: "3f2a9c1e-0000-4000-8000-000000000001",
      userUtterance: "가슴이 답답해요",
    });

    const markup = renderPage();

    expect(markup).toContain("말씀하신 내용");
    expect(markup).toContain("“가슴이 답답해요”");
  });

  it("URL로 바로 들어오거나 말씀하신 내용이 없으면 그 영역을 그리지 않는다", () => {
    expect(renderPage()).not.toContain("말씀하신 내용");

    appActions.enterEmergency({
      intakeId: "3f2a9c1e-0000-4000-8000-000000000001",
      userUtterance: null,
    });

    expect(renderPage()).not.toContain("말씀하신 내용");
  });

  it("처음 그릴 때는 권한을 확인하는 중이라 응급실 영역과 찾기 버튼을 그리지 않고 119가 먼저 보인다", () => {
    const markup = renderPage();

    expect(markup).not.toContain("가까운 응급실");
    expect(markup.indexOf('href="tel:119"')).toBeGreaterThan(-1);
  });
});
