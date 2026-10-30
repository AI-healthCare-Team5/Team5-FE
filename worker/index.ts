// Cloudflare Worker 진입점입니다.
// /api/* 요청은 API_ORIGIN 백엔드로 넘기고, 나머지는 정적 파일과 SPA fallback에 맡깁니다.

export interface Env {
  ASSETS: Fetcher;
  // 백엔드 출처(예: https://api.example.com). 대시보드 런타임 변수 또는 로컬 .env.local에 둡니다.
  API_ORIGIN?: string;
}

const API_PREFIX = "/api/";

// 한 연결 구간에서만 의미가 있어 프록시가 넘기지 않는 헤더입니다.
const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
];

// API_ORIGIN을 검사해 출처만 담은 URL을 돌려줍니다. 쓸 수 없는 값이면 null입니다.
export function parseApiOrigin(value: string | undefined): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // 경로가 붙은 값은 조용히 무시하지 않고 설정 오류로 봅니다.
  if (url.pathname !== "/" || url.search || url.hash) return null;
  if (url.username || url.password) return null;

  return new URL(url.origin);
}

function badGateway(message: string): Response {
  return new Response(JSON.stringify({ error: "bad_gateway", message }), {
    status: 502,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function proxyToBackend(
  request: Request,
  apiOrigin: string | undefined,
): Promise<Response> {
  const origin = parseApiOrigin(apiOrigin);
  if (!origin) {
    return badGateway("API_ORIGIN이 설정되지 않았거나 올바르지 않습니다.");
  }

  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, origin);

  // 설정 실수로 자기 자신을 가리키면 무한히 다시 호출하게 되므로 막습니다.
  if (target.host === url.host) {
    return badGateway("API_ORIGIN이 프론트엔드 주소를 가리킵니다.");
  }

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);

  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.slice(0, -1));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  // duplex는 Node(Vitest)에서 스트림 본문을 보낼 때 필요하고, Workers는 무시합니다.
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    body: hasBody ? request.body : null,
    redirect: "manual",
    duplex: "half",
  };

  try {
    // 응답을 다시 만들지 않고 그대로 돌려줘야 여러 Set-Cookie가 합쳐지지 않습니다.
    return await fetch(new Request(target, init));
  } catch (error) {
    console.error("백엔드 요청 실패", error);
    return badGateway("백엔드에 연결할 수 없습니다.");
  }
}

export function handleRequest(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith(API_PREFIX)) {
    return proxyToBackend(request, env.API_ORIGIN);
  }
  return env.ASSETS.fetch(request);
}

export default {
  fetch: (request, env) => handleRequest(request, env),
} satisfies ExportedHandler<Env>;
