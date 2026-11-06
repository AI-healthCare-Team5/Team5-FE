import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SummaryStorageProps } from "@/pages/summary/components/SummaryStorage";

// isMockApi는 모듈을 불러올 때 정해지므로 테스트마다 환경 변수를 정하고 모듈을 새로 불러옵니다.
async function render(
  mock: boolean,
  props: Partial<SummaryStorageProps> & { loggedIn: boolean; saved: boolean },
) {
  vi.resetModules();
  vi.stubEnv("VITE_API_MOCK", mock ? "true" : "false");
  const { SummaryStorage } =
    await import("@/pages/summary/components/SummaryStorage");
  return renderToStaticMarkup(
    <MemoryRouter>
      <SummaryStorage onLogin={() => {}} onSave={() => {}} {...props} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("요약지 보관 카드", () => {
  it.each([
    ["로그인 전", false, false, "로그인하고 보관하기"],
    ["로그인 뒤", true, false, "내 기록에 보관하기"],
    ["보관한 뒤", true, true, "내 기록 보기"],
  ])(
    "실제 경로에서도 %s 카드를 그린다",
    async (_name, loggedIn, saved, text) => {
      const html = await render(false, { loggedIn, saved });

      expect(html).toContain("내 기록에 보관");
      expect(html).toContain(text);
    },
  );

  it("목 모드에서는 로그인 전에 로그인하고 보관하기를 보여 준다", async () => {
    const html = await render(true, { loggedIn: false, saved: false });

    expect(html).toContain("내 기록에 보관");
    expect(html).toContain("로그인하고 보관하기");
    expect(html).not.toContain("내 기록에 저장했어요.");
  });

  it("목 모드에서는 로그인 뒤 보관하기, 서버가 보관을 알린 뒤 내 기록 보기를 보여 준다", async () => {
    expect(await render(true, { loggedIn: true, saved: false })).toContain(
      "내 기록에 보관하기",
    );

    const saved = await render(true, { loggedIn: true, saved: true });
    expect(saved).toContain("내 기록에 저장했어요.");
    expect(saved).toContain("내 기록 보기");
  });

  it("목 모드에서는 보관 요청 중에 버튼을 잠근다", async () => {
    const html = await render(true, {
      loggedIn: true,
      saved: false,
      saving: true,
    });

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>내 기록에 보관하기/);
    expect(html).toContain('aria-busy="true"');
  });

  it("목 모드에서는 보관하지 못했으면 안내를 보여 주고 다시 누를 수 있다", async () => {
    const html = await render(true, {
      loggedIn: true,
      saved: false,
      message: "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
    });

    expect(html).toContain("일시적인 오류가 생겼어요.");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("내 기록에 저장했어요.");
  });
});
