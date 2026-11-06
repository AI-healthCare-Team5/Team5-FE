import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { locationFailedState } from "@/pages/hospitals/hospitalSearch";
import { RegionPage } from "@/pages/region/RegionPage";

function renderPage(state?: unknown) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[{ pathname: "/region", state }]}>
      <RegionPage />
    </MemoryRouter>,
  );
}

describe("RegionPage", () => {
  it("제목과 시·군 목록 제목, 불러오는 중 안내, 내 위치로 다시 시도를 그린다", () => {
    const markup = renderPage();

    expect(markup).toContain("<h1");
    expect(markup).toContain("찾을까요?");
    expect(markup).toMatch(
      /강원특별자치도 <span class="whitespace-nowrap">시·군<\/span>/,
    );
    expect(markup).toContain("시·군 목록을 불러오는 중이에요.");
    expect(markup).toContain('href="/location"');
    // 목록이 오기 전에는 병원 찾기 버튼을 그리지 않습니다.
    expect(markup).not.toContain("병원 찾기");
  });

  it("직접 지역을 고르기로 해서 들어오면 위치 실패 안내를 보여 주지 않는다", () => {
    expect(renderPage()).not.toContain("위치를 확인하지 못했어요");
  });

  it("위치를 얻지 못해 넘어오면 위치 실패 안내를 보여 준다", () => {
    const markup = renderPage(locationFailedState);

    expect(markup).toContain("위치를 확인하지 못했어요");
    expect(markup).toContain(
      "위치 사용이 허용되지 않았거나 지금은 확인할 수 없어요.",
    );
  });
});
