import { describe, expect, it } from "vitest";
import { getPageTitle } from "@/components/layout/pageTitle";

describe("getPageTitle", () => {
  it.each([
    ["/", "메인화면 · 진료한장"],
    ["/summary", "요약 · 진료한장"],
    ["/interview", "음성 문진 · 진료한장"],
    ["/records/12", "기록 상세 · 진료한장"],
    ["/auth/kakao/callback", "로그인 중 · 진료한장"],
    ["/없는-경로", "없는 페이지 · 진료한장"],
  ])("%s는 %s", (pathname, title) => {
    expect(getPageTitle(pathname)).toBe(title);
  });
});
