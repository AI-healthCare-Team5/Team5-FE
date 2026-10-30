import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleRequest, parseApiOrigin, type Env } from "./index";

// 모든 값은 가짜 데이터입니다.
const APP = "https://app.example.com";
const API = "https://api.example.com";

let backend: ReturnType<typeof vi.fn<(request: Request) => Promise<Response>>>;
let assetsFetch: ReturnType<
  typeof vi.fn<(request: Request) => Promise<Response>>
>;

function makeEnv(apiOrigin?: string): Env {
  return {
    ASSETS: { fetch: assetsFetch } as unknown as Fetcher,
    API_ORIGIN: apiOrigin,
  };
}

function lastUpstream(): Request {
  expect(backend).toHaveBeenCalledTimes(1);
  return backend.mock.calls[0][0];
}

beforeEach(() => {
  backend = vi.fn(async () => new Response("ok"));
  assetsFetch = vi.fn(
    async () =>
      new Response("<!doctype html>", {
        headers: { "content-type": "text/html" },
      }),
  );
  vi.stubGlobal("fetch", backend);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Property 1: /api/* 요청은 백엔드로 전달된다", () => {
  const paths = [
    "/api/me",
    "/api/visits?page=2&sort=desc",
    "/api/visits/1/records",
    "/api/search?q=%EC%A7%84%EB%A3%8C",
    "/api/items?a=1&a=2",
    "/api/empty?",
  ];
  const origins = [
    API,
    `${API}/`,
    "http://localhost:8080",
    "http://localhost:8080/",
  ];

  it.each(
    paths.flatMap((path) => origins.map((origin) => [path, origin] as const)),
  )("%s → %s", async (path, origin) => {
    const response = await handleRequest(
      new Request(APP + path),
      makeEnv(origin),
    );

    const requestUrl = new URL(APP + path);
    const expected =
      new URL(origin).origin + requestUrl.pathname + requestUrl.search;
    expect(lastUpstream().url).toBe(expected);
    expect(assetsFetch).not.toHaveBeenCalled();
    expect(await response.text()).toBe("ok");
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "%s 메서드와 본문을 유지한다",
    async (method) => {
      const body = JSON.stringify({ memo: "가짜 메모" });
      await handleRequest(
        new Request(`${APP}/api/records`, {
          method,
          body,
          headers: { "content-type": "application/json" },
        }),
        makeEnv(API),
      );

      const upstream = lastUpstream();
      expect(upstream.method).toBe(method);
      expect(upstream.headers.get("content-type")).toBe("application/json");
      expect(await upstream.text()).toBe(body);
    },
  );

  it.each(["GET", "HEAD"])("%s 요청은 본문 없이 보낸다", async (method) => {
    await handleRequest(new Request(`${APP}/api/me`, { method }), makeEnv(API));

    const upstream = lastUpstream();
    expect(upstream.method).toBe(method);
    expect(upstream.body).toBeNull();
  });

  it("쿠키와 X-Forwarded 헤더를 전달하고 hop-by-hop 헤더는 뺀다", async () => {
    await handleRequest(
      new Request(`${APP}/api/me`, {
        headers: {
          cookie: "accessToken=test-token; guestKey=test-guest",
          "cf-connecting-ip": "203.0.113.10",
          connection: "keep-alive",
          "keep-alive": "timeout=5",
          te: "trailers",
          "x-custom": "1",
        },
      }),
      makeEnv(API),
    );

    const headers = lastUpstream().headers;
    expect(headers.get("cookie")).toBe(
      "accessToken=test-token; guestKey=test-guest",
    );
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.10");
    expect(headers.get("x-forwarded-host")).toBe("app.example.com");
    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("x-custom")).toBe("1");
    expect(headers.has("connection")).toBe(false);
    expect(headers.has("keep-alive")).toBe(false);
    expect(headers.has("te")).toBe(false);
  });

  it("CF-Connecting-IP가 없으면 X-Forwarded-For를 넣지 않는다", async () => {
    await handleRequest(
      new Request("http://localhost:8787/api/me"),
      makeEnv(API),
    );

    const headers = lastUpstream().headers;
    expect(headers.has("x-forwarded-for")).toBe(false);
    expect(headers.get("x-forwarded-host")).toBe("localhost:8787");
    expect(headers.get("x-forwarded-proto")).toBe("http");
  });

  it("리다이렉트를 따라가지 않는다", async () => {
    await handleRequest(new Request(`${APP}/api/me`), makeEnv(API));
    expect(lastUpstream().redirect).toBe("manual");
  });

  it("여러 Set-Cookie를 합치지 않고 백엔드 응답을 그대로 돌려준다", async () => {
    const headers = new Headers();
    headers.append(
      "set-cookie",
      "accessToken=test-token; Path=/; Secure; HttpOnly",
    );
    headers.append(
      "set-cookie",
      "guestKey=test-guest; Path=/; Secure; HttpOnly",
    );
    const backendResponse = new Response(null, { status: 204, headers });
    backend.mockResolvedValueOnce(backendResponse);

    const response = await handleRequest(
      new Request(`${APP}/api/auth/guest`, { method: "POST" }),
      makeEnv(API),
    );

    expect(response).toBe(backendResponse);
    expect(response.headers.getSetCookie()).toEqual([
      "accessToken=test-token; Path=/; Secure; HttpOnly",
      "guestKey=test-guest; Path=/; Secure; HttpOnly",
    ]);
  });

  it.each([
    [401, null],
    [302, "/api/oauth/next"],
  ])("백엔드 상태 %i를 그대로 돌려준다", async (status, location) => {
    const headers = location ? { location } : undefined;
    backend.mockResolvedValueOnce(new Response(null, { status, headers }));

    const response = await handleRequest(
      new Request(`${APP}/api/me`),
      makeEnv(API),
    );

    expect(response.status).toBe(status);
    expect(response.headers.get("location")).toBe(location);
  });
});

describe("Property 1 오류: 백엔드에 보낼 수 없으면 502 JSON을 돌려준다", () => {
  const invalidOrigins = [
    undefined,
    "",
    "   ",
    "not a url",
    "ftp://api.example.com",
    "https://api.example.com/base",
    "https://api.example.com?x=1",
    APP, // 자기 자신
  ];

  it.each(invalidOrigins)("API_ORIGIN=%j", async (origin) => {
    const response = await handleRequest(
      new Request(`${APP}/api/me`),
      makeEnv(origin),
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    const text = await response.text();
    expect(JSON.parse(text).error).toBe("bad_gateway");
    if (origin?.trim()) expect(text).not.toContain(origin.trim());
    expect(backend).not.toHaveBeenCalled();
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it("백엔드 연결이 실패하면 502를 돌려준다", async () => {
    backend.mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await handleRequest(
      new Request(`${APP}/api/me`),
      makeEnv(API),
    );

    expect(response.status).toBe(502);
    const text = await response.text();
    expect(JSON.parse(text).error).toBe("bad_gateway");
    expect(text).not.toContain("api.example.com");
    expect(assetsFetch).not.toHaveBeenCalled();
  });
});

describe("Property 2: /api/가 아닌 요청은 정적 파일과 SPA fallback에 맡긴다", () => {
  const paths = [
    "/",
    "/visits/1",
    "/records/abc",
    "/api",
    "/apix/y",
    "/assets/index-abc.js",
    "/icons/icon-192.png",
    "/manifest.webmanifest",
  ];
  const origins = [undefined, "", API];
  const methods = ["GET", "HEAD", "POST"];

  it.each(
    paths.flatMap((path) =>
      origins.flatMap((origin) =>
        methods.map((method) => [path, origin, method] as const),
      ),
    ),
  )("%s (API_ORIGIN=%j, %s)", async (path, origin, method) => {
    const request = new Request(APP + path, { method });

    const response = await handleRequest(request, makeEnv(origin));

    expect(assetsFetch).toHaveBeenCalledTimes(1);
    expect(assetsFetch.mock.calls[0][0]).toBe(request);
    expect(response).toBe(await assetsFetch.mock.results[0].value);
    expect(backend).not.toHaveBeenCalled();
  });
});

describe("parseApiOrigin", () => {
  it("끝 슬래시를 정규화한다", () => {
    expect(parseApiOrigin(`${API}/`)?.origin).toBe(API);
    expect(parseApiOrigin(` ${API} `)?.origin).toBe(API);
  });
});
