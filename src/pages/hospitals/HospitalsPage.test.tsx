import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HospitalsPage } from "@/pages/hospitals/HospitalsPage";

// 가짜 응답(VITE_API_MOCK)을 켠 상태를 기본으로 두고, 테스트마다 끌 수 있게 합니다.
const api = vi.hoisted(() => ({ mock: true }));
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  get isMockApi() {
    return api.mock;
  },
}));

afterEach(() => {
  api.mock = true;
});

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <HospitalsPage />
    </MemoryRouter>,
  );
}

describe("HospitalsPage", () => {
  it("가짜 응답에서는 가짜 진료과·병원을 그린다", () => {
    const markup = renderPage();

    expect(markup).toContain("정형외과");
    expect(markup).toContain("OO정형외과의원");
    expect(markup).toContain("tel:");
  });

  it("가짜 응답이 꺼진 실제 경로에서는 가짜 진료과·병원·전화 없이 준비 중으로 보여 준다", () => {
    api.mock = false;
    const markup = renderPage();

    expect(markup).toContain("병원 안내를 준비 중이에요");
    expect(markup).not.toContain("정형외과");
    expect(markup).not.toContain("의원");
    expect(markup).not.toContain("tel:");
    expect(markup).not.toContain("km");
  });
});
