import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// isMockApi는 모듈을 불러올 때 정해지므로 테스트마다 환경 변수를 정하고 모듈을 새로 불러옵니다.
async function render(mock: boolean, loggedIn: boolean, saved: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_API_MOCK", mock ? "true" : "false");
  const { SummaryStorage } =
    await import("@/pages/summary/components/SummaryStorage");
  return renderToStaticMarkup(
    <MemoryRouter>
      <SummaryStorage
        loggedIn={loggedIn}
        saved={saved}
        onLogin={() => {}}
        onSave={() => {}}
      />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("요약지 보관 카드", () => {
  it.each([
    ["로그인 전", false, false],
    ["로그인 뒤", true, false],
    ["보관한 뒤", true, true],
  ])(
    "실제 경로에서는 %s에도 카드를 그리지 않는다",
    async (_name, loggedIn, saved) => {
      const html = await render(false, loggedIn, saved);

      expect(html).toBe("");
    },
  );

  it("목 모드에서는 로그인 전에 로그인하고 보관하기를 보여 준다", async () => {
    const html = await render(true, false, false);

    expect(html).toContain("내 기록에 보관");
    expect(html).toContain("로그인하고 보관하기");
  });

  it("목 모드에서는 로그인 뒤 보관하기, 보관한 뒤 내 기록 보기를 보여 준다", async () => {
    expect(await render(true, true, false)).toContain("내 기록에 보관하기");

    const saved = await render(true, true, true);
    expect(saved).toContain("내 기록에 저장했어요.");
    expect(saved).toContain("내 기록 보기");
  });
});
