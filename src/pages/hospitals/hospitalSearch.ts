import type {
  HospitalSearchOutcome,
  HospitalToday,
} from "@/pages/hospitals/types";

// 병원 목록이 아닌 결과는 각 화면으로 보냅니다.
// S05b(지역 선택, #33)가 생기기 전까지 위치·지역이 없으면 위치 확인 화면(S05a)으로 보냅니다.
export function hospitalOutcomePath(
  outcome: HospitalSearchOutcome,
): string | null {
  switch (outcome.kind) {
    case "found":
      return null;
    case "empty":
      return "/hospital-empty";
    case "needsRegion":
      return "/location";
    case "error":
      return "/hospital-error";
  }
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
