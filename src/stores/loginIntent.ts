// 카카오 로그인으로 페이지를 떠났다가 돌아올 때까지 기억할 내용입니다.
// 메모리 상태는 카카오로 이동하면 사라지므로 sessionStorage에 잠시 둡니다.
const STORAGE_KEY = "jinryo:login-intent";
const DEFAULT_RETURN_TO = "/records";

// "로그인하고 보관하기"로 들어왔을 때 보관할 요약지입니다.
// 문진·요약지 내용은 서버(guestKey)에 있으므로 ID만 기억합니다.
export interface SaveTarget {
  intakeId: string;
  summaryId: string;
}

export interface LoginIntent {
  returnTo: string;
  saveTarget: SaveTarget | null;
}

function isSafePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}

function isSaveTarget(value: unknown): value is SaveTarget {
  if (typeof value !== "object" || value === null) return false;
  const target = value as Record<string, unknown>;
  return (
    typeof target.intakeId === "string" && typeof target.summaryId === "string"
  );
}

function getStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveLoginIntent(intent: LoginIntent) {
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // 저장하지 못하면 로그인 후 기본 화면으로 돌아갑니다.
  }
}

// 기억한 내용을 읽습니다. 없거나 형식이 맞지 않으면 기본값입니다.
export function readLoginIntent(): LoginIntent {
  let raw: string | null;
  try {
    raw = getStorage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    raw = null;
  }

  let value: unknown;
  try {
    value = raw === null ? null : JSON.parse(raw);
  } catch {
    value = null;
  }
  const intent = (value ?? {}) as Partial<Record<keyof LoginIntent, unknown>>;
  return {
    returnTo: isSafePath(intent.returnTo) ? intent.returnTo : DEFAULT_RETURN_TO,
    saveTarget: isSaveTarget(intent.saveTarget) ? intent.saveTarget : null,
  };
}

// 로그인에 성공하면 기억한 내용을 지웁니다.
export function clearLoginIntent() {
  try {
    getStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // 지우지 못해도 다음 로그인에서 덮어씁니다.
  }
}

// 로그인 후 갈 화면입니다.
// 기록 저장 동의(C02)는 "로그인하고 보관하기"로 들어왔고 아직 동의하지 않았을 때만 거칩니다.
export function getLoginDestination(
  intent: LoginIntent,
  needsRecordConsent: boolean,
): string {
  if (intent.saveTarget && needsRecordConsent) return "/record-consent";
  return intent.returnTo;
}
