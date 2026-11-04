import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// isMockApi는 모듈을 불러올 때 정해지므로 테스트마다 환경 변수를 정하고 모듈을 새로 불러옵니다.
async function load(mock: boolean) {
  vi.resetModules();
  if (mock) vi.stubEnv("VITE_API_MOCK", "true");
  const [open, session, summaries] = await Promise.all([
    import("@/stores/openSummarySession"),
    import("@/stores/summarySession"),
    import("@/api/summaries"),
  ]);
  return { ...open, ...session, ...summaries };
}

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

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  vi.stubGlobal("window", { sessionStorage: createStorage() });
  fetchMock = vi.fn<typeof fetch>(() => {
    throw new Error("네트워크를 쓰지 않아야 해요");
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("요약지 세션 열기", () => {
  it("기억해 둔 세션이 있으면 그대로 돌려준다", async () => {
    const api = await load(false);
    api.saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });

    await expect(api.openSummarySession()).resolves.toEqual({
      intakeId: "intake-1",
      summaryId: "summary-1",
    });
  });

  it("실제 경로에서 세션이 없으면 문진을 만들지 않고 null이다", async () => {
    const api = await load(false);

    await expect(api.openSummarySession()).resolves.toBeNull();
    expect(api.readSummarySession()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("가짜 응답에서 세션 만들기", () => {
  it("세션이 없으면 가짜 문진을 끝내 세션을 만들고 ID만 저장한다", async () => {
    const api = await load(true);

    const session = await api.openSummarySession();

    expect(session).not.toBeNull();
    expect(Object.keys(session ?? {}).sort()).toEqual([
      "intakeId",
      "summaryId",
    ]);
    expect(api.readSummarySession()).toEqual(session);
    const stored = window.sessionStorage.getItem("jinryo:summary-session");
    expect(Object.keys(JSON.parse(stored ?? "{}")).sort()).toEqual([
      "intakeId",
      "summaryId",
    ]);
    expect(stored).not.toContain("OO");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("만든 세션의 요약지는 GENERATING을 거쳐 DONE이 된다", async () => {
    const api = await load(true);
    const session = await api.openSummarySession();
    const statuses: string[] = [];

    for (let count = 0; count < 5; count += 1) {
      statuses.push((await api.getSummary(session!.summaryId)).status);
    }

    expect(statuses).toEqual([
      "GENERATING",
      "GENERATING",
      "GENERATING",
      "GENERATING",
      "DONE",
    ]);
    const done = await api.getSummary(session!.summaryId);
    // 붓기·넘어짐은 items에, 건강 정보는 null·[]·목록이 모두 나온다.
    expect(done.summary?.items.map((item) => item.label)).toEqual([
      "붓기",
      "넘어짐",
    ]);
    expect(done.summary?.medications).toBeNull();
    expect(done.summary?.conditions).toHaveLength(1);
    expect(done.summary?.allergies).toEqual([]);
  });

  it("세션이 이미 있으면 새로 만들지 않는다", async () => {
    const api = await load(true);
    const first = await api.openSummarySession();

    await expect(api.openSummarySession()).resolves.toEqual(first);
  });

  it("동시에 열어도 가짜 문진은 한 번만 만든다", async () => {
    const api = await load(true);

    const [first, second] = await Promise.all([
      api.openSummarySession(),
      api.openSummarySession(),
    ]);

    expect(first).toEqual(second);
  });

  it("지운 뒤에는 다시 만든다", async () => {
    const api = await load(true);
    const first = await api.openSummarySession();
    api.clearSummarySession();

    const second = await api.openSummarySession();

    expect(second).not.toEqual(first);
  });
});
