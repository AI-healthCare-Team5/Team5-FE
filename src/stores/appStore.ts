import { useSyncExternalStore } from "react";
import { createSampleRecords } from "@/stores/fixtures";
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
  // 지금 요약지를 내 기록에 보관했는지. 로그인·동의를 거쳐 S06으로 돌아와도 유지합니다.
  summarySaved: boolean;
}

const initialState: AppState = {
  interview: {},
  loggedIn: false,
  nickname: "봄날",
  recordConsent: false,
  records: [],
  returnTo: "/records",
  summarySaved: false,
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
    update({ interview: { ...initialState.interview }, summarySaved: false });
  },
  prepareLogin(returnTo = "/records") {
    update({ returnTo });
  },
  loginDemo() {
    update({
      loggedIn: true,
      records: state.loggedIn ? state.records : createSampleRecords(),
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
    update({ records: [record, ...state.records], summarySaved: true });
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
      summarySaved: false,
    });
  },
  withdraw() {
    update({
      loggedIn: false,
      recordConsent: false,
      records: [],
      returnTo: "/records",
      summarySaved: false,
    });
  },
};
