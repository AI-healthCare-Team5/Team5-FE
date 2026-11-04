// 요약지 화면(S06a, S06)이 어느 문진·요약지를 보여 줄지 기억합니다.
// 카카오 로그인으로 페이지를 떠났다 돌아오거나 새로고침해도 같은 요약지가 이어지도록 sessionStorage에 둡니다.
// ID만 둡니다. 요약지 내용과 증상 같은 진료 정보는 서버에 있고, 저장소에는 넣지 않습니다.
const STORAGE_KEY = "jinryo:summary-session";

export interface SummarySession {
  intakeId: string;
  summaryId: string;
}

// 저장소를 쓸 수 없는 브라우저(사이트 데이터 차단 등)에서도 이 페이지를 닫기 전까지는 흐름이 이어지게 합니다.
// 이 경우 새로고침하면 잃습니다.
let memorySession: SummarySession | null = null;

// 값에서 두 ID만 꺼냅니다. 다른 값이 섞여 있어도 가져오지 않습니다.
function toSession(value: unknown): SummarySession | null {
  if (typeof value !== "object" || value === null) return null;
  const { intakeId, summaryId } = value as Record<string, unknown>;
  if (typeof intakeId !== "string" || intakeId === "") return null;
  if (typeof summaryId !== "string" || summaryId === "") return null;
  return { intakeId, summaryId };
}

function getStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// 문진이 COMPLETED가 되면 응답의 intakeId와 summaryId로 부릅니다.
// 두 ID가 문자열이 아니거나 비어 있으면 저장하지 않습니다.
export function saveSummarySession(session: SummarySession) {
  const ids = toSession(session);
  if (!ids) return;
  memorySession = ids;
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 저장하지 못해도 이 페이지에서는 메모리의 값으로 이어집니다.
  }
}

// 기억한 ID를 읽습니다. 없거나 형식이 맞지 않으면 null입니다.
export function readSummarySession(): SummarySession | null {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY) ?? null;
    const stored = raw === null ? null : toSession(JSON.parse(raw));
    if (stored) return stored;
  } catch {
    // 읽지 못하거나 JSON이 아니면 메모리의 값을 씁니다.
  }
  return memorySession ? { ...memorySession } : null;
}

// 문진을 취소했거나 서버에서 찾을 수 없다고 할 때 지웁니다.
export function clearSummarySession() {
  memorySession = null;
  try {
    getStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // 지우지 못해도 서버가 없다고 답하므로 다음 조회에서 다시 지워집니다.
  }
}
