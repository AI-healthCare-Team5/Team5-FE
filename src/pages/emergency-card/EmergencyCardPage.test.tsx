import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { EmergencyCardPage } from "@/pages/emergency-card/EmergencyCardPage";
import { fromMyInfoState } from "@/pages/emergency-card/emergencyCard";
import { appActions } from "@/stores/appStore";

function renderPage(state?: unknown) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[{ pathname: "/emergency-card", state }]}>
      <EmergencyCardPage />
    </MemoryRouter>,
  );
}

// 링크 글자로 a 태그를 찾아 href를 돌려줍니다. 속성 순서나 클래스가 바뀌어도 깨지지 않게 합니다.
function hrefOf(markup: string, text: string): string | null {
  for (const [, attrs, inner] of markup.matchAll(/<a([^>]*)>(.*?)<\/a>/g)) {
    if (inner.replace(/<[^>]*>/g, "").trim() === text) {
      return /href="([^"]*)"/.exec(attrs)?.[1] ?? null;
    }
  }
  return null;
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

  it("내 정보에서 미리 보기로 열면 응급 안내로 돌아가기는 숨기고 119와 처음으로는 둔다", () => {
    const markup = renderPage(fromMyInfoState);

    expect(markup).not.toContain('href="/emergency"');
    expect(markup).not.toContain("응급 안내로 돌아가기");
    expect(markup).toContain('href="tel:119"');
    expect(hrefOf(markup, "처음으로")).toBe("/");
  });

  it("같은 세션에 응급 문진이 있어도 미리 보기는 그 카드를 불러오지 않는다", () => {
    appActions.enterEmergency({
      intakeId: "3f2a9c1e-0000-4000-8000-000000000001",
      userUtterance: "가슴이 답답해요",
    });

    const markup = renderPage(fromMyInfoState);

    expect(markup).not.toContain("응급 카드를 불러오고 있어요.");
    expect(markup).toContain("<dl");
    expect(markup.match(/확인 못 했어요/g)?.length).toBeGreaterThanOrEqual(7);
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
    expect(markup).toMatch(/href="\/guardian"[^>]*>바꾸기</);
    expect(markup).toMatch(/<button[^>]*>지우기</);
  });

  it("로그인했고 보호자가 없으면 등록하기가 보호자 연락처 등록(E03)으로 간다", () => {
    appActions.applyMember({
      memberId: 1,
      nickname: "봄날",
      provider: "KAKAO",
      consents: {
        record: { agreed: true, policyVersion: "v1", agreedAt: "2026-11-04" },
        guardian: { agreed: false, policyVersion: null, agreedAt: null },
      },
      recordCount: 0,
      guardian: null,
    });

    const markup = renderPage();

    expect(markup).toMatch(/href="\/guardian"[^>]*>등록하기</);
    expect(markup).not.toContain("바꾸기");
    expect(markup).not.toContain("지우기");
  });

  it("로그인하지 않았으면 등록하기는 링크가 아니라 로그인 안내 버튼이다", () => {
    const markup = renderPage();

    expect(markup).toMatch(/<button[^>]*>등록하기</);
    expect(markup).not.toContain('href="/guardian"');
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
