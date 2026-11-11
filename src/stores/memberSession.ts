import { logout } from "@/api/auth";
import {
  getErrorMessage,
  getFieldErrors,
  isApiError,
  isUnauthenticated,
} from "@/api/errors";
import {
  deleteGuardian,
  saveGuardian,
  type GuardianInput,
} from "@/api/guardians";
import { getMyInfo, withdrawMember } from "@/api/members";
import type { FieldError } from "@/api/types";
import { appActions, getAppState } from "@/stores/appStore";

// 회원 정보를 서버와 맞추는 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 요청이 성공한 뒤에만 store를 바꾸고, 코드 실수(ApiError가 아닌 오류)와 취소는 그대로 던집니다.

export type MemberLoad = "loggedIn" | "loggedOut";

// 내 정보를 불러와 store에 반영합니다. 서버가 AUTH_401이면 로그인하지 않은 것으로 봅니다.
// 새로고침하면 store의 로그인 상태가 사라지므로, 로그인이 필요한 화면은 이 함수로 먼저 확인합니다.
export async function loadMember(signal?: AbortSignal): Promise<MemberLoad> {
  try {
    const info = await getMyInfo(signal);
    // 응답이 도착한 뒤 취소됐다면(로그아웃을 시작했거나 화면을 떠남) 로그인 상태를 되살리지 않습니다.
    signal?.throwIfAborted();
    appActions.applyMember(info);
    return "loggedIn";
  } catch (error) {
    if (!isUnauthenticated(error)) throw error;
    appActions.markLoggedOut();
    return "loggedOut";
  }
}

// 로그아웃합니다. 요청이 실패하면 쿠키가 남아 있을 수 있어서 로그인 상태를 그대로 두고 오류를 던집니다.
export async function logoutMember(signal?: AbortSignal): Promise<void> {
  await logout(signal);
  appActions.logout();
}

// 탈퇴합니다. 서버가 AUTH_401이면 탈퇴가 처리되지 않았으므로 로그인이 풀린 것으로만 다룹니다.
export async function withdrawAccount(
  signal?: AbortSignal,
): Promise<"withdrawn" | "loggedOut"> {
  try {
    await withdrawMember(signal);
  } catch (error) {
    if (!isUnauthenticated(error)) throw error;
    appActions.markLoggedOut();
    return "loggedOut";
  }
  appActions.withdraw();
  return "withdrawn";
}

export type GuardianOutcome =
  | { kind: "saved" }
  | { kind: "removed" }
  // 로그인이 풀렸습니다. 로그인(L01)으로 안내합니다.
  | { kind: "needsLogin" }
  // GUARDIAN_400입니다. fieldErrors의 field(relation, phoneNumber, consentAgreed, policyVersion)로 칸 아래에 안내합니다.
  | { kind: "invalid"; message: string; fieldErrors: FieldError[] }
  | { kind: "failed"; message: string };

// 보호자를 등록하거나 바꿉니다. 서버가 GUARDIAN 동의를 함께 저장하므로 성공하면 동의한 것으로 반영합니다.
export async function saveGuardianContact(
  input: GuardianInput,
  signal?: AbortSignal,
): Promise<GuardianOutcome> {
  const wasLoggedIn = getAppState().loggedIn;
  try {
    const { relation, phoneNumber } = await saveGuardian(input, signal);
    // 응답이 도착한 뒤 화면을 떠났거나(취소) 그 사이 로그아웃·탈퇴했다면 store를 덮어쓰지 않습니다.
    signal?.throwIfAborted();
    if (wasLoggedIn && !getAppState().loggedIn) {
      return { kind: "needsLogin" };
    }
    appActions.setGuardian({ relation, phoneNumber });
    return { kind: "saved" };
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (isUnauthenticated(error)) {
      appActions.markLoggedOut();
      return { kind: "needsLogin" };
    }
    const fieldErrors = getFieldErrors(error);
    if (error.code === "GUARDIAN_400") {
      return { kind: "invalid", message: getErrorMessage(error), fieldErrors };
    }
    return { kind: "failed", message: getErrorMessage(error) };
  }
}

// 보호자를 지웁니다. 서버가 GUARDIAN 동의도 함께 철회합니다.
// 이미 지워져 있으면(GUARDIAN_404) 원하는 상태이므로 지운 것으로 다룹니다.
export async function removeGuardianContact(
  signal?: AbortSignal,
): Promise<GuardianOutcome> {
  try {
    await deleteGuardian(signal);
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (isUnauthenticated(error)) {
      appActions.markLoggedOut();
      return { kind: "needsLogin" };
    }
    if (error.code !== "GUARDIAN_404") {
      return { kind: "failed", message: getErrorMessage(error) };
    }
  }
  appActions.setGuardian(null);
  return { kind: "removed" };
}
