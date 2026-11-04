import { useSyncExternalStore } from "react";
import type { Guardian } from "@/api/guardians";
import type { MemberInfo } from "@/api/members";
import { resetIntakeFlow } from "@/stores/intakeSession";
import {
  readLoginIntent,
  type LoginIntent,
  type SaveTarget,
} from "@/stores/loginIntent";
import type { Interview } from "@/stores/model";

interface AppState {
  interview: Interview;
  loggedIn: boolean;
  nickname: string;
  // 기록 저장 동의(RECORD)를 했는지입니다. 서버가 알려 준 값만 담습니다.
  recordConsent: boolean;
  // 서버가 알려 준 보호자입니다. 없으면 null이고, 전화번호는 가운데를 가린 값입니다.
  guardian: Guardian | null;
  // 보호자 연락처 저장 동의(GUARDIAN)를 했는지입니다. 보호자를 지우면 서버가 함께 철회합니다.
  guardianConsent: boolean;
  // 내 정보를 불러왔을 때의 보관한 기록 수입니다.
  recordCount: number;
  returnTo: string;
  // "로그인하고 보관하기"로 로그인한 경우 보관할 요약지입니다.
  saveTarget: SaveTarget | null;
  // 지금 요약지를 내 기록에 보관했는지. 로그인·동의를 거쳐 S06으로 돌아와도 유지합니다.
  summarySaved: boolean;
}

// 카카오를 다녀오거나 새로고침해도 로그인 전에 기억한 내용으로 이어집니다.
const loginIntent = readLoginIntent();

const initialState: AppState = {
  interview: {},
  loggedIn: false,
  nickname: "",
  recordConsent: false,
  guardian: null,
  guardianConsent: false,
  recordCount: 0,
  returnTo: loginIntent.returnTo,
  saveTarget: loginIntent.saveTarget,
  summarySaved: false,
};

// 계정에 묶인 값을 비로그인 상태로 되돌립니다.
const signedOutAccount = {
  loggedIn: false,
  nickname: "",
  recordConsent: false,
  guardian: null,
  guardianConsent: false,
  recordCount: 0,
} satisfies Partial<AppState>;

let state: AppState = initialState;
const listeners = new Set<() => void>();

function update(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppState() {
  return state;
}

export function useAppStore() {
  // 세 번째 인자는 테스트의 renderToStaticMarkup처럼 서버 렌더링으로 그릴 때 씁니다.
  return useSyncExternalStore(subscribe, getAppState, getAppState);
}

export const appActions = {
  answer(key: keyof Interview, value: string) {
    update({ interview: { ...state.interview, [key]: value } });
  },
  // 흐름을 처음부터 다시 시작하는 곳(S01의 시작 버튼)에서 부릅니다. 이전 문진과 요약지 ID도 함께 지웁니다.
  startInterview() {
    resetIntakeFlow();
    update({
      interview: { ...initialState.interview },
      summarySaved: false,
    });
  },
  prepareLogin(returnTo = "/records", saveTarget: SaveTarget | null = null) {
    update({ returnTo, saveTarget });
  },
  // 카카오 로그인 응답으로 로그인 상태를 바꿉니다.
  // 기록과 보호자는 내 정보(applyMember)나 기록 API에서 불러오고, 여기서는 넣지 않습니다.
  completeLogin(
    result: { nickname: string | null; needsRecordConsent: boolean },
    intent: LoginIntent,
  ) {
    update({
      loggedIn: true,
      nickname: result.nickname ?? "",
      recordConsent: !result.needsRecordConsent,
      returnTo: intent.returnTo,
      saveTarget: intent.saveTarget,
    });
  },
  // 내 정보(GET /members/me) 응답으로 로그인 상태와 동의, 보호자를 바꿉니다.
  // 새로고침한 뒤 로그인 상태가 남아 있는지 확인할 때도 씁니다.
  applyMember(info: MemberInfo) {
    update({
      loggedIn: true,
      nickname: info.nickname ?? "",
      recordConsent: info.consents.record.agreed,
      guardian: info.guardian,
      guardianConsent: info.consents.guardian.agreed,
      recordCount: info.recordCount,
    });
  },
  // 서버가 기록 저장 동의를 받은 뒤에 부릅니다.
  agreeToRecords() {
    if (!state.loggedIn) {
      return;
    }
    update({ recordConsent: true });
  },
  // 보관을 요청했는데 서버가 동의가 없다(CONSENT_403)고 한 경우입니다.
  revokeRecordConsent() {
    update({ recordConsent: false });
  },
  // 서버가 요약지를 내 기록에 보관했다고 알린 뒤에 부릅니다.
  markSummarySaved() {
    update({ summarySaved: true });
  },
  // 보호자를 등록·변경하거나 지운 결과입니다. 등록·변경은 GUARDIAN 동의도 함께 받고, 삭제는 함께 철회합니다.
  setGuardian(guardian: Guardian | null) {
    update({ guardian, guardianConsent: guardian !== null });
  },
  // 로그인이 풀렸다(AUTH_401)고 서버가 알렸을 때입니다. 비로그인 문진 흐름과 보관하려던 요약지 기억은 그대로 둡니다.
  markLoggedOut() {
    if (!state.loggedIn) {
      return;
    }
    update(signedOutAccount);
  },
  // 서버가 로그아웃한 뒤에 부릅니다. 서버가 이 브라우저의 문진·요약지도 지우므로 기억한 ID도 함께 지웁니다.
  logout() {
    resetIntakeFlow();
    update({
      ...signedOutAccount,
      returnTo: "/records",
      saveTarget: null,
      summarySaved: false,
    });
  },
  // 서버가 탈퇴를 처리한 뒤에 부릅니다. 쿠키와 기록, 동의가 모두 지워집니다.
  withdraw() {
    resetIntakeFlow();
    update({
      ...signedOutAccount,
      returnTo: "/records",
      saveTarget: null,
      summarySaved: false,
    });
  },
};
