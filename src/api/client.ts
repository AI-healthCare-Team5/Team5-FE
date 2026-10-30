import { ApiError, INVALID_RESPONSE, NETWORK_ERROR } from "@/api/errors";
import type { ApiResponse } from "@/api/types";

// 같은 출처의 /api로 요청하면 프록시(Worker, Vite)가 백엔드로 넘깁니다.
const API_BASE = "/api";
const REFRESH_PATH = "/auth/refresh";

// 백엔드 없이 가짜 데이터로 화면을 확인할 때 VITE_API_MOCK=true로 둡니다.
// 각 도메인 API 함수가 이 값을 보고 가짜 응답을 돌려줍니다.
export const isMockApi = import.meta.env.VITE_API_MOCK === "true";

type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  // JSON으로 보낼 본문입니다.
  body?: unknown;
  // 값이 null·undefined인 키는 보내지 않습니다.
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

// refresh도 AUTH_401이면 비로그인 상태가 되었다고 알립니다.
const unauthenticatedListeners = new Set<() => void>();

export function onUnauthenticated(listener: () => void): () => void {
  unauthenticatedListeners.add(listener);
  return () => {
    unauthenticatedListeners.delete(listener);
  };
}

function notifyUnauthenticated() {
  unauthenticatedListeners.forEach((listener) => listener());
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  if (!path.startsWith("/") || path.startsWith(`${API_BASE}/`)) {
    throw new Error(`API 경로는 /api를 뺀 /로 시작해야 해요: ${path}`);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined)
      params.append(key, String(value));
  }
  const search = params.toString();
  return `${API_BASE}${path}${search ? `?${search}` : ""}`;
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.isSuccess === "boolean" &&
    typeof body.code === "string" &&
    typeof body.message === "string" &&
    "result" in body
  );
}

async function send<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const hasBody = options.body !== undefined;
  const headers: Record<string, string> = { accept: "application/json" };
  if (hasBody) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      // 같은 출처라 기본값으로도 쿠키가 실리지만, 이슈 #75 기준대로 명시합니다.
      credentials: "include",
      signal: options.signal,
    });
  } catch (error) {
    // 요청을 취소한 경우는 화면이 따로 처리하도록 그대로 던집니다.
    if (options.signal?.aborted) throw error;
    throw new ApiError(NETWORK_ERROR, "", 0);
  }

  let body: unknown;
  try {
    body = JSON.parse(await response.text());
  } catch {
    body = null;
  }

  // 프록시의 502 JSON처럼 공통 형식이 아닌 응답입니다.
  if (!isApiResponse(body)) {
    throw new ApiError(INVALID_RESPONSE, "", response.status);
  }
  if (!body.isSuccess) {
    throw new ApiError(body.code, body.message, response.status, body.result);
  }
  return body.result as T;
}

// 동시에 여러 요청이 401을 받아도 refresh는 한 번만 부릅니다.
let refreshing: Promise<void> | null = null;

function refreshOnce(): Promise<void> {
  refreshing ??= send<unknown>(REFRESH_PATH, { method: "POST" })
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function isAuthExpired(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "AUTH_401";
}

// API를 호출하고 성공 응답의 result를 돌려줍니다. 실패하면 ApiError를 던집니다.
// AUTH_401이면 토큰을 한 번 재발급하고 원래 요청을 다시 보냅니다.
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (error) {
    if (!isAuthExpired(error) || path === REFRESH_PATH) throw error;

    try {
      await refreshOnce();
    } catch (refreshError) {
      if (isAuthExpired(refreshError)) {
        notifyUnauthenticated();
        throw error;
      }
      throw refreshError;
    }

    try {
      return await send<T>(path, options);
    } catch (retryError) {
      if (isAuthExpired(retryError)) notifyUnauthenticated();
      throw retryError;
    }
  }
}
