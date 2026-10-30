import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLoginDestination,
  readLoginIntent,
  saveLoginIntent,
  takeLoginIntent,
} from "@/stores/loginIntent";

// 모든 값은 가짜 데이터입니다.
const saveTarget = { intakeId: "intake-1", summaryId: "summary-1" };

function createStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

let storage: Storage;

beforeEach(() => {
  storage = createStorage();
  vi.stubGlobal("window", { sessionStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("로그인 전 기억", () => {
  it("저장한 내용을 꺼내면 지운다", () => {
    saveLoginIntent({ returnTo: "/summary", saveTarget });

    expect(takeLoginIntent()).toEqual({ returnTo: "/summary", saveTarget });
    expect(takeLoginIntent()).toEqual({
      returnTo: "/records",
      saveTarget: null,
    });
  });

  it("읽기만 하면 지우지 않는다", () => {
    saveLoginIntent({ returnTo: "/my-info", saveTarget: null });

    readLoginIntent();

    expect(readLoginIntent().returnTo).toBe("/my-info");
  });

  it.each([
    ["다른 사이트 주소", { returnTo: "https://example.com" }],
    ["// 주소", { returnTo: "//example.com" }],
    ["형식이 맞지 않는 값", { returnTo: 1, saveTarget: { intakeId: 1 } }],
  ])("%s는 기본값으로 돌린다", (_, value) => {
    storage.setItem("jinryo:login-intent", JSON.stringify(value));

    expect(takeLoginIntent()).toEqual({
      returnTo: "/records",
      saveTarget: null,
    });
  });

  it("JSON이 아니면 기본값으로 돌린다", () => {
    storage.setItem("jinryo:login-intent", "{");

    expect(takeLoginIntent().returnTo).toBe("/records");
  });

  it("sessionStorage를 쓸 수 없어도 기본값으로 동작한다", () => {
    vi.stubGlobal("window", {
      get sessionStorage(): Storage {
        throw new Error("blocked");
      },
    });

    saveLoginIntent({ returnTo: "/summary", saveTarget });

    expect(takeLoginIntent().returnTo).toBe("/records");
  });
});

describe("로그인 후 갈 화면", () => {
  it("보관하러 왔고 동의가 필요하면 C02로 간다", () => {
    expect(
      getLoginDestination({ returnTo: "/summary", saveTarget }, true),
    ).toBe("/record-consent");
  });

  it("보관하러 왔어도 이미 동의했으면 원래 화면으로 간다", () => {
    expect(
      getLoginDestination({ returnTo: "/summary", saveTarget }, false),
    ).toBe("/summary");
  });

  it("보관하러 온 게 아니면 동의가 필요해도 원래 화면으로 간다", () => {
    expect(
      getLoginDestination({ returnTo: "/my-info", saveTarget: null }, true),
    ).toBe("/my-info");
  });
});
