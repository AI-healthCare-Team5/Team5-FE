import { getErrorMessage, isApiError, isSessionGone } from "@/api/errors";
import { searchHospitals, type HospitalSearchResult } from "@/api/hospitals";
import {
  getIntakeDepartment,
  type DepartmentRecommendation,
} from "@/api/intakes";
import type { MapLocation } from "@/components/map/types";
import type { HospitalQuery } from "@/pages/hospitals/hospitalSearch";
import { resolveSearchLocation } from "@/pages/hospitals/searchLocation";
import { clearIntakeSession, readIntakeSession } from "@/stores/intakeSession";
import {
  clearSummarySession,
  readSummarySession,
} from "@/stores/summarySession";

// S05(병원 안내)의 동작입니다. React 밖에 두어서 화면 없이 테스트합니다.
// 화면은 onView로 받은 view를 그리고, onExit로 받은 곳으로 이동합니다.

export interface HospitalsView {
  // loading: 진료과와 병원을 찾는 중, ready: 병원 목록을 보여 주는 중
  // error: 병원 검색 서버에 닿지 못하는 등 안내가 필요한 실패(S05d가 아닌 이 화면의 "다시 시도")
  phase: "loading" | "ready" | "error";
  // phase가 ready일 때만 있습니다.
  department: DepartmentRecommendation | null;
  result: HospitalSearchResult | null;
  // 현재 위치로 찾았을 때만 있습니다. 지도에 내 위치로 표시합니다.
  userLocation: MapLocation | null;
  // phase가 error일 때의 안내입니다.
  message: string | null;
}

export const initialHospitalsView: HospitalsView = {
  phase: "loading",
  department: null,
  result: null,
  userLocation: null,
  message: null,
};

// start: 문진을 끝낸 기록이 없거나 서버에 없어 처음(/)으로 갑니다.
// location: 위치를 알 수 없어 위치 확인(S05a)으로 갑니다. locationFailed면 위치를 얻지 못했다고 알립니다.
//   지역 선택(S05b, #33)이 생기면 위치도 지역도 없을 때의 도착 화면을 그쪽으로 바꿉니다.
// empty: 반경 안에 병원이 없어 S05c로 갑니다.
// error: 공공데이터 조회 실패(HOSPITAL_500)라 S05d로 갑니다.
export type HospitalsExit =
  | { to: "start" }
  | { to: "location"; locationFailed: boolean }
  | { to: "empty" }
  | { to: "error" };

export interface HospitalsHooks {
  onView: (view: HospitalsView) => void;
  onExit: (exit: HospitalsExit) => void;
}

export interface HospitalsScreen {
  // 진료과와 위치를 정하고 병원을 찾습니다. 실패해서 보이는 "다시 시도"도 이 함수입니다.
  load: () => Promise<void>;
  // 화면을 떠날 때 부릅니다. 진행 중인 요청을 취소하고 더는 view나 이동을 알리지 않습니다.
  dispose: () => void;
}

export function createHospitalsScreen(
  query: HospitalQuery,
  hooks: HospitalsHooks,
): HospitalsScreen {
  let disposed = false;
  let exited = false;
  // 조회를 취소하는 데 씁니다. 다시 시작하면 이전 것을 취소합니다.
  let run: AbortController | null = null;

  function update(view: HospitalsView) {
    if (disposed) return;
    hooks.onView(view);
  }

  function leave(exit: HospitalsExit) {
    if (disposed || exited) return;
    exited = true;
    hooks.onExit(exit);
  }

  // 문진 응답(COMPLETED)에서 받아 둔 진료과를 먼저 씁니다.
  // 새로고침이나 다시 들어온 경우는 기억해 둔 문진 ID로 서버에서 다시 조회합니다.
  // 문진을 끝낸 기록이 없으면 null입니다.
  async function findDepartment(
    signal: AbortSignal,
  ): Promise<DepartmentRecommendation | null> {
    const stored = readIntakeSession()?.intake;
    if (stored?.status === "COMPLETED" && stored.department) {
      return stored.department;
    }
    const session = readSummarySession();
    if (!session) return null;
    const { departmentCode, departmentName, recommendReason } =
      await getIntakeDepartment(session.intakeId, signal);
    return { departmentCode, departmentName, recommendReason };
  }

  // 서버에 없는 문진이라 더는 이어갈 수 없을 때입니다. 기억한 것을 지우고 처음으로 갑니다.
  function forget() {
    clearIntakeSession();
    clearSummarySession();
    leave({ to: "start" });
  }

  async function load() {
    run?.abort();
    const current = new AbortController();
    run = current;
    update(initialHospitalsView);

    try {
      const department = await findDepartment(current.signal);
      if (current.signal.aborted) return;
      if (!department) {
        leave({ to: "start" });
        return;
      }

      const location = await resolveSearchLocation(query);
      if (current.signal.aborted) return;
      if (!location) {
        leave({ to: "location", locationFailed: true });
        return;
      }

      const outcome = await searchHospitals(
        {
          departmentCode: department.departmentCode,
          ...location.params,
          radius: query.radius,
        },
        current.signal,
      );
      if (current.signal.aborted) return;

      switch (outcome.kind) {
        case "found":
          update({
            phase: "ready",
            department,
            result: outcome.result,
            userLocation: location.point,
            message: null,
          });
          return;
        case "empty":
          leave({ to: "empty" });
          return;
        case "needsRegion":
          leave({ to: "location", locationFailed: false });
          return;
        case "error":
          leave({ to: "error" });
          return;
      }
    } catch (error) {
      if (current.signal.aborted) return;
      // DEPARTMENT_409: 기억한 문진이 아직 끝나지 않았다고 합니다. 이 화면에서 할 수 있는 일이 없습니다.
      if (
        isSessionGone(error) ||
        (isApiError(error) && error.code === "DEPARTMENT_409")
      ) {
        forget();
        return;
      }
      // 코드 실수는 서버 오류 안내로 바꾸지 않고 그대로 던집니다.
      if (!isApiError(error)) throw error;
      update({
        ...initialHospitalsView,
        phase: "error",
        message: getErrorMessage(error),
      });
    }
  }

  function dispose() {
    disposed = true;
    run?.abort();
  }

  return { load, dispose };
}
