import { useSyncExternalStore } from "react";
import { createSampleRecords } from "@/stores/fixtures";
import type { LoginIntent, SaveTarget } from "@/stores/loginIntent";
import {
  createSummary,
  type Interview,
  type SavedRecord,
} from "@/stores/model";

interface AppState {
  interview: Interview;
  loggedIn: boolean;
  nickname: string;
  recordConsent: boolean;
  records: SavedRecord[];
  returnTo: string;
  // "로그인하고 보관하기"로 로그인한 경우 보관할 요약지입니다.
  saveTarget: SaveTarget | null;
}

const initialState: AppState = {
  interview: {},
  loggedIn: false,
  nickname: "봄날",
  recordConsent: false,
  records: [],
  returnTo: "/records",
  saveTarget: null,
};

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

export function useAppStore() {
  return useSyncExternalStore(subscribe, () => state);
}

export const appActions = {
  answer(key: keyof Interview, value: string) {
    update({ interview: { ...state.interview, [key]: value } });
  },
  startInterview() {
    update({ interview: { ...initialState.interview } });
  },
  prepareLogin(returnTo = "/records", saveTarget: SaveTarget | null = null) {
    update({ returnTo, saveTarget });
  },
  // 카카오 로그인 응답으로 로그인 상태를 바꿉니다. 기록 목록은 기록 API 연결 전까지 예시 데이터입니다.
  completeLogin(
    result: { nickname: string | null; needsRecordConsent: boolean },
    intent: LoginIntent,
  ) {
    update({
      loggedIn: true,
      nickname: result.nickname ?? "",
      recordConsent: !result.needsRecordConsent,
      records: state.loggedIn ? state.records : createSampleRecords(),
      returnTo: intent.returnTo,
      saveTarget: intent.saveTarget,
    });
  },
  agreeToRecords() {
    if (!state.loggedIn) {
      return;
    }
    update({ recordConsent: true });
  },
  saveSummary() {
    if (!state.loggedIn || !state.recordConsent) {
      return;
    }
    const record: SavedRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      summary: createSummary(state.interview),
    };
    update({ records: [record, ...state.records] });
  },
  deleteRecord(id: string) {
    const records = state.records.filter((record) => record.id !== id);
    update({
      records,
      recordConsent: records.length === 0 ? false : state.recordConsent,
    });
  },
  logout() {
    update({
      loggedIn: false,
      nickname: "봄날",
      recordConsent: false,
      records: [],
      returnTo: "/records",
      saveTarget: null,
    });
  },
  withdraw() {
    update({
      loggedIn: false,
      recordConsent: false,
      records: [],
      returnTo: "/records",
      saveTarget: null,
    });
  },
};
