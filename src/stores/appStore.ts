import { useSyncExternalStore } from "react";
import { isMockApi } from "@/api/client";
import type { SummaryContent } from "@/api/summaries";
import { requestCurrentPosition } from "@/components/map/currentPosition";
import type { CurrentLocation, EmergencyEntry } from "@/stores/emergency";
import { createSampleRecords } from "@/stores/fixtures";
import { resetIntakeFlow } from "@/stores/intakeSession";
import {
  readLoginIntent,
  type LoginIntent,
  type SaveTarget,
} from "@/stores/loginIntent";
import type { Interview, SavedRecord } from "@/stores/model";

interface AppState {
  interview: Interview;
  // 문진 응답이 응급 전환이면 채웁니다. URL로 바로 들어오면 null이고 E01은 119 안내만 보여 줍니다.
  emergency: EmergencyEntry | null;
  currentLocation: CurrentLocation;
  loggedIn: boolean;
  nickname: string;
  recordConsent: boolean;
  records: SavedRecord[];
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
  emergency: null,
  currentLocation: { status: "unasked" },
  loggedIn: false,
  nickname: "봄날",
  recordConsent: false,
  records: [],
  returnTo: loginIntent.returnTo,
  saveTarget: loginIntent.saveTarget,
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
      emergency: null,
      currentLocation: initialState.currentLocation,
      summarySaved: false,
    });
  },
  // 문진 응답이 응급 전환이면 E01로 보내기 전에 부릅니다.
  enterEmergency(entry: EmergencyEntry) {
    update({ emergency: entry });
  },
  // 새 문진을 시작하면 지난 응급 전환 정보를 지웁니다. 주소로 E01에 다시 들어와도 이전 말이 보이지 않게 합니다.
  clearEmergency() {
    update({ emergency: null });
  },
  // 위치가 없을 때 한 번만 묻습니다. 거부했거나 받지 못했으면 다시 묻지 않습니다.
  askCurrentLocationOnce() {
    if (state.currentLocation.status !== "unasked") {
      return;
    }
    update({ currentLocation: { status: "asking" } });
    void requestCurrentPosition().then((location) => {
      // 묻는 동안 새 문진을 시작했으면 결과를 쓰지 않습니다.
      if (state.currentLocation.status !== "asking") {
        return;
      }
      update({
        currentLocation: location
          ? { status: "found", location }
          : { status: "unavailable" },
      });
    });
  },
  prepareLogin(returnTo = "/records", saveTarget: SaveTarget | null = null) {
    update({ returnTo, saveTarget });
  },
  // 카카오 로그인 응답으로 로그인 상태를 바꿉니다.
  // 예시 기록은 가짜 응답(VITE_API_MOCK)에서만 넣고, 실제 로그인에서는 기록 API 연결 전까지 비워 둡니다.
  completeLogin(
    result: { nickname: string | null; needsRecordConsent: boolean },
    intent: LoginIntent,
  ) {
    update({
      loggedIn: true,
      nickname: result.nickname ?? "",
      recordConsent: !result.needsRecordConsent,
      records: state.loggedIn
        ? state.records
        : isMockApi
          ? createSampleRecords()
          : [],
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
  // 보관할 요약지는 S06이 갖고 있어서 인자로 받습니다.
  // 동의 화면(C02)처럼 요약지를 모르는 곳이 인자 없이 부르면 보관하지 않고,
  // 동의 뒤 S06으로 돌아왔을 때 S06이 saveTarget을 보고 보관합니다.
  // 같은 요약지를 두 번 보관하지 않습니다(StrictMode의 effect 두 번 실행 포함).
  // 기록 저장 API(#29)가 연결되기 전까지 실제 경로에서는 보관하지 않습니다.
  // 메모리에만 남는 기록을 저장 성공으로 보여 주지 않으려는 것이고, 로그인 복귀 후 자동 보관도 여기서 막힙니다.
  saveSummary(summary?: SummaryContent) {
    if (
      !isMockApi ||
      !summary ||
      !state.loggedIn ||
      !state.recordConsent ||
      state.summarySaved
    ) {
      return;
    }
    const record: SavedRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      summary,
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
      saveTarget: null,
      summarySaved: false,
    });
  },
  withdraw() {
    update({
      loggedIn: false,
      recordConsent: false,
      records: [],
      returnTo: "/records",
      saveTarget: null,
      summarySaved: false,
    });
  },
};
