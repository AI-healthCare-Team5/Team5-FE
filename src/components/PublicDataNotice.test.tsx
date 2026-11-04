import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicDataNotice } from "@/components/PublicDataNotice";

describe("공공데이터 안내", () => {
  it("갱신일을 서울 날짜로 적고 가기 전에 전화로 확인하라고 안내한다", () => {
    const markup = renderToStaticMarkup(
      <PublicDataNotice dataUpdatedAt="2026-11-04T04:00:00+09:00" />,
    );

    expect(markup).toContain("공공데이터 기준 · 2026.11.04 갱신");
    expect(markup).toContain("가기 전에 전화로 진료 여부를 꼭 확인하세요.");
  });
});
