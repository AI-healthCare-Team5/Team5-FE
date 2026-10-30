import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getKakaoMapSdkUrl,
  type KakaoMapsApi,
} from "@/components/map/kakaoMapLoader";

describe("카카오맵 SDK 주소", () => {
  it("지도를 직접 초기화할 수 있게 자동 로드를 끈다", () => {
    expect(getKakaoMapSdkUrl("abc")).toBe(
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=abc&autoload=false",
    );
  });
  it("앱 키를 주소에 안전하게 넣는다", () => {
    expect(getKakaoMapSdkUrl("a&b")).toContain("appkey=a%26b&");
  });
});

interface FakeScript {
  src: string;
  async: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  remove: () => void;
  removed: boolean;
}

// 브라우저 없이 로더를 확인하려고 script 태그와 window.kakao만 흉내 냅니다.
function setupBrowser() {
  const scripts: FakeScript[] = [];
  const fakeWindow: { kakao?: { maps: KakaoMapsApi } } = {};
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("document", {
    createElement: () => {
      const script: FakeScript = {
        src: "",
        async: false,
        onload: null,
        onerror: null,
        removed: false,
        remove: () => {
          script.removed = true;
        },
      };
      return script;
    },
    head: { append: (script: FakeScript) => scripts.push(script) },
  });
  return { scripts, fakeWindow };
}

function fakeMaps(load: (callback: () => void) => void) {
  return { load } as unknown as KakaoMapsApi;
}

async function importLoader() {
  vi.resetModules();
  return import("@/components/map/kakaoMapLoader");
}

describe("카카오맵 SDK 로드", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("지도 코어 로드 콜백이 오면 SDK를 넘긴다", async () => {
    const { scripts, fakeWindow } = setupBrowser();
    const { loadKakaoMaps } = await importLoader();
    const maps = fakeMaps((callback) => callback());
    const loading = loadKakaoMaps("key");
    fakeWindow.kakao = { maps };
    scripts[0].onload?.();
    await expect(loading).resolves.toBe(maps);
  });

  it("지도 코어 로드 콜백이 오지 않으면 제한 시간 뒤 실패하고 SDK를 지운다", async () => {
    const { scripts, fakeWindow } = setupBrowser();
    const { loadKakaoMaps } = await importLoader();
    const loading = loadKakaoMaps("key", 1000);
    const result = expect(loading).rejects.toThrow("제시간에");
    fakeWindow.kakao = { maps: fakeMaps(() => {}) };
    scripts[0].onload?.();
    await vi.advanceTimersByTimeAsync(1000);
    await result;
    expect(scripts[0].removed).toBe(true);
    expect(fakeWindow.kakao).toBeUndefined();
  });

  it("실패한 뒤 다시 부르면 SDK를 처음부터 다시 불러온다", async () => {
    const { scripts, fakeWindow } = setupBrowser();
    const { loadKakaoMaps } = await importLoader();
    const first = loadKakaoMaps("key", 1000);
    const firstResult = expect(first).rejects.toThrow();
    scripts[0].onerror?.();
    await firstResult;
    const maps = fakeMaps((callback) => callback());
    const second = loadKakaoMaps("key", 1000);
    expect(scripts).toHaveLength(2);
    fakeWindow.kakao = { maps };
    scripts[1].onload?.();
    await expect(second).resolves.toBe(maps);
  });
});
