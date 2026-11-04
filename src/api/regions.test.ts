import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 모든 값은 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

const regionList = {
  regions: [
    {
      regionCode: "51720",
      regionName: "OO군",
      centerLatitude: 37.697,
      centerLongitude: 127.8888,
    },
  ],
};

function envelope(
  status: number,
  body: {
    isSuccess: boolean;
    code: string;
    message?: string;
    result?: unknown;
  },
) {
  return new Response(JSON.stringify({ message: "", result: null, ...body }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ok = () =>
  envelope(200, { isSuccess: true, code: "HOSPITAL_200", result: regionList });
const serverError = () =>
  envelope(500, { isSuccess: false, code: "HOSPITAL_500", message: "오류" });

// 시·군 목록은 모듈 안에 저장되므로 테스트마다 모듈을 새로 불러옵니다.
async function loadRegions() {
  vi.resetModules();
  return import("@/api/regions");
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("시·군 목록", () => {
  it("GET /api/regions를 부르고 결과를 돌려준다", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    const { getRegions } = await loadRegions();

    await expect(getRegions()).resolves.toEqual(regionList);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/regions");
    expect(init.method).toBe("GET");
  });

  it("성공한 결과는 저장해 두고 다음부터 요청하지 않는다", async () => {
    fetchMock.mockImplementation(async () => ok());
    const { getRegions } = await loadRegions();

    const first = await getRegions();
    const second = await getRegions();
    const third = await getRegions();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it("호출한 쪽이 결과를 바꿔도 저장한 목록과 다음 호출은 영향받지 않는다", async () => {
    fetchMock.mockImplementation(async () => ok());
    const { getRegions } = await loadRegions();

    const first = await getRegions();
    first.regions.length = 0;
    const second = await getRegions();
    second.regions[0].regionName = "바뀐 이름";
    second.regions.reverse();
    const third = await getRegions();

    expect(third).toEqual(regionList);
    expect(first).not.toBe(second);
    expect(second).not.toBe(third);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("동시에 부르면 요청 하나를 나눠 쓰되 결과 객체는 각자 따로 받는다", async () => {
    let respond: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (respond = resolve)),
    );
    const { getRegions } = await loadRegions();

    const calls = [getRegions(), getRegions(), getRegions()];
    expect(fetchMock).toHaveBeenCalledTimes(1);
    respond(ok());
    const results = await Promise.all(calls);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results[0]).toEqual(regionList);
    expect(results[1]).toEqual(regionList);
    expect(results[2]).toEqual(regionList);
    expect(results[1]).not.toBe(results[0]);
    expect(results[2]).not.toBe(results[0]);
    results[0].regions.length = 0;
    expect(results[1].regions).toHaveLength(1);
  });

  it("실패는 저장하지 않고 다음 호출에서 다시 요청한다", async () => {
    fetchMock.mockResolvedValueOnce(serverError()).mockResolvedValueOnce(ok());
    const { getRegions } = await loadRegions();

    const failure = getRegions();
    // resetModules로 ApiError 클래스가 새로 만들어지므로 name으로 확인합니다.
    await expect(failure).rejects.toMatchObject({
      name: "ApiError",
      code: "HOSPITAL_500",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(getRegions()).resolves.toEqual(regionList);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await getRegions();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("함께 기다리던 호출은 모두 같은 실패를 받고, 그다음 호출은 다시 요청한다", async () => {
    let respond: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (respond = resolve)),
    );
    fetchMock.mockResolvedValueOnce(ok());
    const { getRegions } = await loadRegions();

    const first = getRegions();
    const second = getRegions();
    const assertions = Promise.all([
      expect(first).rejects.toMatchObject({ code: "HOSPITAL_500" }),
      expect(second).rejects.toMatchObject({ code: "HOSPITAL_500" }),
    ]);
    respond(serverError());
    await assertions;
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(getRegions()).resolves.toEqual(regionList);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
