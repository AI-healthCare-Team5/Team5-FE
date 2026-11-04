import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { SummaryStorage } from "@/pages/summary/components/SummaryStorage";

function render(
  props: Partial<Parameters<typeof SummaryStorage>[0]> & {
    loggedIn: boolean;
    saved: boolean;
  },
) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SummaryStorage onLogin={() => {}} onSave={() => {}} {...props} />
    </MemoryRouter>,
  );
}

describe("요약지 보관 카드", () => {
  it("로그인 전에는 로그인하고 보관하기를 보여 준다", () => {
    const html = render({ loggedIn: false, saved: false });

    expect(html).toContain("내 기록에 보관");
    expect(html).toContain("로그인하고 보관하기");
    expect(html).not.toContain("내 기록에 저장했어요.");
  });

  it("로그인 뒤에는 보관하기, 서버가 보관을 알린 뒤에는 내 기록 보기를 보여 준다", () => {
    expect(render({ loggedIn: true, saved: false })).toContain(
      "내 기록에 보관하기",
    );

    const saved = render({ loggedIn: true, saved: true });
    expect(saved).toContain("내 기록에 저장했어요.");
    expect(saved).toContain("내 기록 보기");
  });

  it("보관 요청 중에는 버튼을 잠근다", () => {
    const html = render({ loggedIn: true, saved: false, saving: true });

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>내 기록에 보관하기/);
    expect(html).toContain('aria-busy="true"');
  });

  it("보관하지 못했으면 안내를 보여 주고 다시 누를 수 있다", () => {
    const html = render({
      loggedIn: true,
      saved: false,
      message: "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
    });

    expect(html).toContain("일시적인 오류가 생겼어요.");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("내 기록에 저장했어요.");
  });
});
