import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { EmergencyCardPage } from "@/pages/emergency-card/EmergencyCardPage";
import { appActions } from "@/stores/appStore";

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EmergencyCardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  appActions.logout();
});

describe("EmergencyCardPage", () => {
  it("문진 없이 열면(미리 보기) 항목을 '확인 못 했어요'로 채우고 119와 돌아가기를 그린다", () => {
    const markup = renderPage();

    expect(markup).toContain("구급대원에게 이 화면을 보여 주세요.");
    expect(markup).toContain("<h1");
    expect(markup).toContain("응급 카드");
    expect(markup.match(/확인 못 했어요/g)?.length).toBeGreaterThanOrEqual(7);
    expect(markup).toContain("등록된 연락처가 없어요");
    expect(markup).toContain('href="tel:119"');
    expect(markup).toContain('href="/emergency"');
    expect(markup).toContain(
      "환자가 말한 내용을 정리한 것이며 진단이 아닙니다.",
    );
    expect(markup).not.toContain("작성");
  });

  it("미리 보기에서는 내 정보의 보호자를 보여 주고, 가린 번호라 전화 버튼은 없다", () => {
    appActions.applyMember({
      memberId: 1,
      nickname: "봄날",
      provider: "KAKAO",
      consents: {
        record: { agreed: true, policyVersion: "v1", agreedAt: "2026-11-04" },
        guardian: { agreed: true, policyVersion: "v1", agreedAt: "2026-11-04" },
      },
      recordCount: 0,
      guardian: { relation: "DAUGHTER", phoneNumber: "010-****-0000" },
    });

    const markup = renderPage();

    expect(markup).toContain("딸 · 010-****-0000");
    expect(markup).not.toContain('href="tel:010');
    expect(markup).toContain("내 보호자 연락처");
    expect(markup).toContain("지우기");
  });

  it("응급 전환으로 들어오면 불러오는 동안 항목을 그리지 않는다", () => {
    appActions.enterEmergency({
      intakeId: "3f2a9c1e-0000-4000-8000-000000000001",
      userUtterance: "가슴이 답답해요",
    });

    const markup = renderPage();

    expect(markup).toContain("응급 카드를 불러오고 있어요.");
    expect(markup).not.toContain("<dl");
    expect(markup).toContain('href="tel:119"');
  });
});
