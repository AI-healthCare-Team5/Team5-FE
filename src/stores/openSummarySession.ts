import { isMockApi } from "@/api/client";
import { startMockSummarySession } from "@/stores/mockSummarySession";
import {
  readSummarySession,
  type SummarySession,
} from "@/stores/summarySession";

// StrictMode에서 화면이 두 번 열려도 가짜 문진은 한 번만 만듭니다.
let pendingMock: Promise<SummarySession> | null = null;

// 요약지 화면(S06a, S06)이 처음 하는 일입니다. 기억해 둔 세션을 돌려주고, 없으면 null입니다.
// null이면 화면은 처음(/)으로 보냅니다.
// 가짜 응답(VITE_API_MOCK)에서만, 세션이 없을 때 가짜 문진을 끝내 세션을 만듭니다.
export async function openSummarySession(): Promise<SummarySession | null> {
  const existing = readSummarySession();
  if (existing) return existing;
  if (!isMockApi) return null;

  pendingMock ??= startMockSummarySession().finally(() => {
    pendingMock = null;
  });
  return pendingMock;
}
