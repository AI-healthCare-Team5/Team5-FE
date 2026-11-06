import appSource from "@/App.tsx?raw";
import { describe, expect, it } from "vitest";
import { KAKAO_CALLBACK_PATH } from "@/api/auth";
import { getPageTitle, pageTitles } from "@/components/layout/pageTitle";

describe("getPageTitle", () => {
  it.each([
    ["/", "메인화면 · 진료한장"],
    ["/summary", "요약지 · 진료한장"],
    ["/summary/", "요약지 · 진료한장"],
    ["/interview", "음성 문진 · 진료한장"],
    ["/records", "내 기록 · 진료한장"],
    ["/records/", "내 기록 · 진료한장"],
    ["/records/12", "기록 상세 · 진료한장"],
    ["/records/12/", "기록 상세 · 진료한장"],
    ["/auth/kakao/callback", "로그인 중 · 진료한장"],
    ["/없는-경로", "없는 페이지 · 진료한장"],
    ["/records/12/extra", "없는 페이지 · 진료한장"],
  ])("%s는 %s", (pathname, title) => {
    expect(getPageTitle(pathname)).toBe(title);
  });
});

// 새 경로를 App.tsx에만 추가하면 탭 제목이 "없는 페이지"가 되므로, 두 곳이 어긋나면 여기서 잡습니다.
describe("pageTitles와 App.tsx 경로", () => {
  const appPaths = [
    ...appSource.matchAll(/path:\s*(?:"([^"]+)"|(KAKAO_CALLBACK_PATH))/g),
  ]
    .map((match) => match[1] ?? KAKAO_CALLBACK_PATH)
    .filter((path) => path !== "*" && !path.includes(":"));

  it("App.tsx의 경로를 읽어 옵니다", () => {
    expect(appPaths.length).toBeGreaterThan(10);
  });

  it("App.tsx의 모든 경로에 제목이 있습니다", () => {
    const missing = appPaths.filter((path) => !(path in pageTitles));
    expect(missing).toEqual([]);
  });

  it("App.tsx에 없는 경로의 제목은 두지 않습니다", () => {
    const extra = Object.keys(pageTitles).filter(
      (path) => !appPaths.includes(path),
    );
    expect(extra).toEqual([]);
  });
});
