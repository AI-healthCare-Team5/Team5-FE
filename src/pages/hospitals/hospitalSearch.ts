import {
  HOSPITAL_RADIUS_DEFAULT_KM,
  type HospitalToday,
} from "@/api/hospitals";

// S05c "30km까지 넓혀서 찾기"가 쓰는 반경이고, 서버가 받는 가장 큰 반경입니다.
export const HOSPITAL_RADIUS_EXPANDED_KM = 30;

// S05 병원 안내와 S05c·S05d가 주소로 주고받는 검색 조건입니다.
// 새로고침해도 같은 검색이 이어지고, 지역 선택 화면(S05b, #33)은 이 주소로 이동하면 됩니다.
export interface HospitalQuery {
  // 검색 반경 km입니다. 없으면 기본값(10km)입니다.
  radius?: number;
  // 위치 대신 쓸 지역 코드입니다(S05b). 없으면 현재 위치로 찾습니다.
  regionCode?: string;
}

// 주소의 검색 조건을 읽습니다. 1~30 사이 정수가 아닌 radius는 없는 것으로 보고 기본값을 씁니다.
export function parseHospitalQuery(params: URLSearchParams): HospitalQuery {
  const rawRadius = params.get("radius");
  const radius =
    rawRadius !== null && /^\d+$/.test(rawRadius) ? Number(rawRadius) : null;
  const regionCode = params.get("regionCode")?.trim();
  return {
    ...(radius !== null && radius >= 1 && radius <= HOSPITAL_RADIUS_EXPANDED_KM
      ? { radius }
      : {}),
    ...(regionCode ? { regionCode } : {}),
  };
}

// 검색 조건을 주소에 붙여 같은 검색을 이어 갑니다.
export function withHospitalQuery(path: string, query: HospitalQuery): string {
  const params = new URLSearchParams();
  if (query.radius !== undefined) params.set("radius", String(query.radius));
  if (query.regionCode) params.set("regionCode", query.regionCode);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

// 실제로 찾는 반경입니다.
export function effectiveRadius(query: HospitalQuery): number {
  return query.radius ?? HOSPITAL_RADIUS_DEFAULT_KM;
}

// 위치를 얻지 못해 S05에서 위치 확인(S05a)으로 돌아올 때 함께 넘기는 값입니다.
export const locationFailedState = { locationFailed: true } as const;

export function isLocationFailed(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    (state as { locationFailed?: unknown }).locationFailed === true
  );
}

export interface TodayHours {
  // 진료 중이면 초록 점과 글자로 보여 줍니다.
  open: boolean;
  text: string;
}

const seoulDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const seoulTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// 기기 시간대와 상관없이 한국 날짜(YYYY-MM-DD)를 구합니다.
export function seoulDateString(date: Date): string {
  return seoulDate.format(date);
}

// 기기 시간대와 상관없이 한국 날짜로 며칠 차이인지 셉니다.
function daysFromToday(target: Date, now: Date): number {
  const toDay = (date: Date) => Date.parse(`${seoulDateString(date)}T00:00Z`);
  return Math.round((toDay(target) - toDay(now)) / 86_400_000);
}

function dayLabel(target: Date, now: Date): string {
  const days = daysFromToday(target, now);
  if (days === 0) return "오늘";
  if (days === 1) return "내일";
  const [, month, day] = seoulDateString(target).split("-").map(Number);
  return `${month}월 ${day}일`;
}

// today로 "오늘 18:00까지 진료", "진료 종료 · 내일 09:00 시작" 같은 문구를 만듭니다.
// 진료 시간 정보가 없으면(null) 줄을 보여 주지 않습니다.
export function formatTodayHours(
  today: HospitalToday | null,
  now: Date,
): TodayHours | null {
  if (!today) return null;
  if (today.is24Hours) return { open: true, text: "24시간 진료" };
  if (today.isOpen) {
    return {
      open: true,
      text: today.closeTime ? `오늘 ${today.closeTime}까지 진료` : "진료 중",
    };
  }
  if (!today.nextOpenAt) return { open: false, text: "진료 종료" };
  const next = new Date(today.nextOpenAt);
  const label = dayLabel(next, now);
  const start = `${label} ${seoulTime.format(next)} 시작`;
  // 아직 문을 열기 전이면 끝난 것이 아니라서 "진료 종료"를 붙이지 않습니다.
  return {
    open: false,
    text: label === "오늘" ? start : `진료 종료 · ${start}`,
  };
}
