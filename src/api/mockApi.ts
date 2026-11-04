// VITE_API_MOCK=true일 때 쓰는 가짜 응답입니다. 서버가 돌려주는 모양(Swagger)과 같게 만듭니다.
// 문진과 요약지는 한 흐름이라 상태를 함께 둡니다. 새로고침하면 상태가 사라집니다.
// 병원명은 OO·△△·XX, 전화번호는 000-0000-0000처럼 실제 정보가 아닌 값만 씁니다.
import {
  ageGroups,
  genders,
  isEnumValue,
  summarySteps,
  yesNoUnknownAnswers,
  type BodyPart,
  type IntakeStage,
  type IntakeStatus,
  type Onset,
  type SummaryStatus,
  type YesNoUnknown,
} from "@/api/enums";
import { ApiError } from "@/api/errors";
import type {
  EmergencyRoomParams,
  HealthCenterResult,
  Hospital,
  HospitalDepartment,
  HospitalLocationParams,
  HospitalSearchParams,
  HospitalSearchResult,
} from "@/api/hospitals";
import type {
  DepartmentRecommendation,
  IntakeAnswerRequest,
  IntakeCancelResult,
  IntakeDepartmentResult,
  IntakeQuestion,
  IntakeResponse,
  IntakeStartRequest,
} from "@/api/intakes";
import type {
  EmergencyCardResponse,
  HealthInfoItem,
  SummaryConfirmResult,
  SummaryContent,
  SummaryResponse,
  SummaryRetryResult,
  SummaryStepState,
  SummaryUpdateRequest,
} from "@/api/summaries";
import type { RegionListResult } from "@/api/regions";
import type { CollectedList } from "@/api/types";

const DATA_UPDATED_AT = "2026-11-04T04:00:00+09:00";
const SUMMARY_CREATED_AT = "2026-11-04T10:00:00+09:00";

// 모은 정보(collected)에 서버가 쓰는 문구와 같게 맞췄습니다(개발 서버에서 확인한 값).
const bodyPartLabels: Record<BodyPart, string> = {
  HEAD: "머리",
  CHEST: "가슴",
  ABDOMEN: "배",
  BACK: "허리 · 등",
  ARM_SHOULDER: "팔 · 어깨",
  LEG_KNEE: "다리 · 무릎",
  SKIN: "피부",
  ETC: "기타",
};

const onsetLabels: Record<Onset, string> = {
  TODAY: "오늘",
  DAYS_2_3: "2~3일 전부터",
  OVER_WEEK: "일주일 이상",
};

const yesNoLabels: Record<YesNoUnknown, string> = {
  YES: "네",
  NO: "아니요",
  UNKNOWN: "잘 모르겠어요",
};

// ---- 시·군 ----

// 강원 18개 시·군입니다. 서버 응답과 같이 가나다순입니다. 모듈이 불러와질 때가 아니라 부를 때 만들어서,
// 가짜 응답을 쓰지 않는 프로덕션 번들에서는 이 데이터가 통째로 빠집니다.
export function getRegions(): RegionListResult {
  const rows: [string, string, number, number][] = [
    ["51150", "강릉시", 37.752, 128.876],
    ["51820", "고성군", 38.38, 128.468],
    ["51170", "동해시", 37.525, 129.114],
    ["51230", "삼척시", 37.45, 129.165],
    ["51210", "속초시", 38.207, 128.591],
    ["51800", "양구군", 38.11, 127.99],
    ["51830", "양양군", 38.075, 128.619],
    ["51750", "영월군", 37.184, 128.462],
    ["51130", "원주시", 37.342, 127.92],
    ["51810", "인제군", 38.07, 128.17],
    ["51770", "정선군", 37.38, 128.661],
    ["51780", "철원군", 38.147, 127.313],
    ["51110", "춘천시", 37.881, 127.73],
    ["51190", "태백시", 37.164, 128.986],
    ["51760", "평창군", 37.371, 128.39],
    ["51720", "홍천군", 37.697, 127.889],
    ["51790", "화천군", 38.106, 127.708],
    ["51730", "횡성군", 37.491, 127.985],
  ];
  return {
    regions: rows.map(
      ([regionCode, regionName, centerLatitude, centerLongitude]) => ({
        regionCode,
        regionName,
        centerLatitude,
        centerLongitude,
      }),
    ),
  };
}

// ---- 병원 ----

// 가짜 응답에서는 브라우저에 위치 권한을 묻지 않고 이 좌표(홍천군 중심)를 현재 위치로 씁니다.
// 가짜 병원들이 이 근처에 있어 지도와 거리가 맞게 보입니다.
export function getMockUserLocation(): { latitude: number; longitude: number } {
  return { latitude: 37.697, longitude: 127.889 };
}

const orthopedics: HospitalDepartment[] = [
  { departmentCode: "05", departmentName: "정형외과" },
];

const mockHospitals: Hospital[] = [
  {
    hospitalId: 101,
    name: "OO정형외과의원",
    hospitalType: "31",
    hospitalTypeName: "의원",
    departments: orthopedics,
    distanceKm: 1.2,
    latitude: 37.6971,
    longitude: 127.8887,
    phoneNumber: "000-0000-0000",
    address: "강원특별자치도 OO시 OO로 00",
    hasEmergencyRoom: false,
    today: {
      isOpen: true,
      is24Hours: false,
      openTime: "09:00",
      closeTime: "18:00",
      nextOpenAt: null,
    },
  },
  {
    hospitalId: 102,
    name: "△△병원",
    hospitalType: "21",
    hospitalTypeName: "병원",
    departments: orthopedics,
    distanceKm: 2.4,
    latitude: 37.7012,
    longitude: 127.8934,
    phoneNumber: "000-0000-0000",
    address: "강원특별자치도 OO시 OO로 00",
    hasEmergencyRoom: false,
    today: {
      isOpen: false,
      is24Hours: false,
      openTime: null,
      closeTime: null,
      nextOpenAt: "2026-11-05T09:00:00+09:00",
    },
  },
  {
    hospitalId: 103,
    name: "XX종합병원",
    hospitalType: "11",
    hospitalTypeName: "종합병원",
    departments: orthopedics,
    distanceKm: 4.8,
    latitude: 37.7105,
    longitude: 127.9021,
    phoneNumber: "000-0000-0000",
    address: "강원특별자치도 OO시 OO로 00",
    hasEmergencyRoom: true,
    today: {
      isOpen: true,
      is24Hours: true,
      openTime: "00:00",
      closeTime: "23:59",
      nextOpenAt: null,
    },
  },
];

const mockHealthCenter: Hospital = {
  hospitalId: 201,
  name: "OO보건소",
  hospitalType: "71",
  hospitalTypeName: "보건소",
  departments: [],
  distanceKm: 6.3,
  latitude: 37.6902,
  longitude: 127.8801,
  phoneNumber: "000-0000-0000",
  address: "강원특별자치도 OO시 OO로 00",
  hasEmergencyRoom: false,
  today: {
    isOpen: true,
    is24Hours: false,
    openTime: "09:00",
    closeTime: "18:00",
    nextOpenAt: null,
  },
};

// 응급실은 항상 24시간으로 내려옵니다.
const mockEmergencyRooms: Hospital[] = [
  {
    hospitalId: 301,
    name: "OO대학교병원 응급의료센터",
    hospitalType: "11",
    hospitalTypeName: "종합병원",
    departments: [{ departmentCode: "24", departmentName: "응급의학과" }],
    distanceKm: 4.8,
    latitude: 37.7105,
    longitude: 127.9021,
    phoneNumber: "033-000-0000",
    address: "강원특별자치도 OO시 OO로 00",
    hasEmergencyRoom: true,
    today: {
      isOpen: true,
      is24Hours: true,
      openTime: "00:00",
      closeTime: "23:59",
      nextOpenAt: null,
    },
  },
  {
    hospitalId: 302,
    name: "△△병원 응급실",
    hospitalType: "21",
    hospitalTypeName: "병원",
    departments: [{ departmentCode: "24", departmentName: "응급의학과" }],
    distanceKm: 12.6,
    latitude: 37.7801,
    longitude: 127.9502,
    phoneNumber: "033-000-0000",
    address: "강원특별자치도 △△시 △△로 00",
    hasEmergencyRoom: true,
    today: {
      isOpen: true,
      is24Hours: true,
      openTime: "00:00",
      closeTime: "23:59",
      nextOpenAt: null,
    },
  },
];

// 서버처럼 위치(latitude·longitude)와 지역(regionCode)이 모두 없으면 location 오류를 냅니다.
function requireLocation(params: HospitalLocationParams) {
  const hasPoint =
    params.latitude !== undefined && params.longitude !== undefined;
  if (hasPoint || params.regionCode) return;
  throw new ApiError("HOSPITAL_400", "위치나 지역을 알려 주세요.", 400, {
    errors: [{ field: "location", reason: "위치와 지역 중 하나는 필요해요." }],
  });
}

// 서버처럼 radius와 limit이 정수 범위를 벗어나면 해당 field로 오류를 냅니다.
// 실제 서버 경로에서는 검증하지 않고 서버가 판단합니다.
function requireIntegerInRange(
  field: string,
  value: number,
  min: number,
  max: number,
) {
  if (Number.isInteger(value) && value >= min && value <= max) return;
  throw new ApiError("HOSPITAL_400", `${field}은(는) 잘못된 값이에요.`, 400, {
    errors: [{ field, reason: `${min}~${max} 사이의 정수여야 해요.` }],
  });
}

export function searchHospitals(
  params: HospitalSearchParams,
  radius: number,
  limit: number,
): HospitalSearchResult {
  requireLocation(params);
  requireIntegerInRange("radius", radius, 1, 30);
  requireIntegerInRange("limit", limit, 1, 20);
  const now = new Date();
  const inRadius = mockHospitals.filter((item) => item.distanceKm <= radius);
  return {
    radiusKm: radius,
    dataUpdatedAt: DATA_UPDATED_AT,
    totalCount: inRadius.length,
    hospitals: structuredClone(inRadius.slice(0, limit)).map((hospital) =>
      reopenTomorrow(hospital, now),
    ),
  };
}

const seoulDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 지금 쉬는 가짜 병원의 다음 진료 시작을 지금 기준 다음 날 09:00으로 맞춥니다.
// 날짜를 고정해 두면 날이 지난 뒤에 "내일 09:00 시작"이 지난 날짜로 보이기 때문입니다.
function reopenTomorrow(hospital: Hospital, now: Date): Hospital {
  const { today } = hospital;
  if (!today?.nextOpenAt) return hospital;
  const tomorrow = new Date(now.getTime() + 86_400_000);
  return {
    ...hospital,
    today: {
      ...today,
      nextOpenAt: `${seoulDate.format(tomorrow)}T09:00:00+09:00`,
    },
  };
}

export function getNearestHealthCenter(
  params: HospitalLocationParams,
): HealthCenterResult {
  requireLocation(params);
  return {
    dataUpdatedAt: DATA_UPDATED_AT,
    hospital: structuredClone(mockHealthCenter),
  };
}

export function getEmergencyRooms(
  params: EmergencyRoomParams,
  radius: number,
  limit: number,
): HospitalSearchResult {
  requireLocation(params);
  requireIntegerInRange("radius", radius, 1, 50);
  requireIntegerInRange("limit", limit, 1, 10);
  const inRadius = mockEmergencyRooms.filter(
    (item) => item.distanceKm <= radius,
  );
  return {
    radiusKm: radius,
    dataUpdatedAt: DATA_UPDATED_AT,
    totalCount: inRadius.length,
    hospitals: structuredClone(inRadius.slice(0, limit)),
  };
}

// ---- 문진 ----

interface MockQuestion extends IntakeQuestion {
  stage: IntakeStage;
  // 모은 정보와 요약지 항목에 쓰는 이름입니다.
  label: string;
}

// 글·말로 시작할 때만 묻는 증상 질문입니다.
const symptomQuestions: MockQuestion[] = [
  {
    questionId: "q_swelling",
    text: "아픈 곳이 부었나요?",
    answerType: "YES_NO_UNKNOWN",
    options: null,
    stage: "SYMPTOM",
    label: "붓기",
  },
  {
    questionId: "q_fall",
    text: "최근에 넘어지신 적이 있나요?",
    answerType: "YES_NO_UNKNOWN",
    options: null,
    stage: "SYMPTOM",
    label: "넘어짐",
  },
];

// 모든 문진이 거치는 기본 정보 5문항입니다. 개발 서버와 같이 복용약·앓는 병·알레르기는 FREE_TEXT입니다.
// FREE_TEXT는 말·글로만 답할 수 있고, 버튼으로 답하면 INTAKE_400입니다.
const basicInfoQuestions: MockQuestion[] = [
  {
    questionId: "q_age_group",
    text: "연세가 어떻게 되세요?",
    answerType: "SINGLE_CHOICE",
    options: [
      { code: "UNDER_50", label: "50대 이하" },
      { code: "SIXTIES", label: "60대" },
      { code: "SEVENTIES", label: "70대" },
      { code: "OVER_80", label: "80대 이상" },
    ],
    stage: "BASIC_INFO",
    label: "나이대",
  },
  {
    questionId: "q_gender",
    text: "성별을 알려 주세요.",
    answerType: "SINGLE_CHOICE",
    options: [
      { code: "MALE", label: "남성" },
      { code: "FEMALE", label: "여성" },
    ],
    stage: "BASIC_INFO",
    label: "성별",
  },
  {
    questionId: "q_medications",
    text: '지금 드시는 약이 있나요? 없으면 "없어요"라고 해 주세요.',
    answerType: "FREE_TEXT",
    options: null,
    stage: "BASIC_INFO",
    label: "복용약",
  },
  {
    questionId: "q_conditions",
    text: '앓고 계신 병이 있나요? 없으면 "없어요"라고 해 주세요.',
    answerType: "FREE_TEXT",
    options: null,
    stage: "BASIC_INFO",
    label: "앓는 병",
  },
  {
    questionId: "q_allergies",
    text: '약이나 음식 알레르기가 있나요? 없으면 "없어요"라고 해 주세요.',
    answerType: "FREE_TEXT",
    options: null,
    stage: "BASIC_INFO",
    label: "알레르기",
  },
];

const mockDepartment: DepartmentRecommendation = {
  departmentCode: "05",
  departmentName: "정형외과",
  recommendReason: "불편하신 곳과 시작 시점을 바탕으로 정형외과 진료를 권해요.",
};

interface MockAnswer {
  questionId: string;
  // 선택지·예/아니요 답의 code입니다. FREE_TEXT 답은 선택지가 없어 빈 문자열입니다.
  code: string;
  // 선택지·예/아니요 답은 화면에 보이는 문구, FREE_TEXT 답은 사용자가 쓴 글(앞뒤 공백 제외)입니다.
  label: string;
}

interface MockIntake {
  intakeId: string;
  start: IntakeStartRequest;
  answers: MockAnswer[];
  summaryId: string | null;
}

interface MockSummary {
  summaryId: string;
  intakeId: string;
  // 조회할 때마다 늘어납니다. 단계 수를 넘으면 DONE입니다.
  polls: number;
  // true면 FAILED_AT_POLL번째 조회부터 FAILED입니다. 다시 만들면 false가 됩니다.
  failing: boolean;
  content: SummaryContent;
}

const intakes = new Map<string, MockIntake>();
const summaries = new Map<string, MockSummary>();
let serial = 0;

function mockUuid(prefix: string, number: number): string {
  return `${prefix}-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function badRequest(code: string, field: string, reason: string): ApiError {
  return new ApiError(code, reason, 400, { errors: [{ field, reason }] });
}

function intakeConflict(status: IntakeStatus | null): ApiError {
  return new ApiError(
    "INTAKE_409",
    status === null ? "지금 질문이 아니에요." : "이미 끝난 문진이에요.",
    409,
    status === null ? null : { status },
  );
}

function findIntake(intakeId: string): MockIntake {
  const intake = intakes.get(intakeId);
  if (!intake) {
    throw new ApiError("INTAKE_404", "문진을 찾을 수 없어요.", 404);
  }
  return intake;
}

function sequenceOf(intake: MockIntake): MockQuestion[] {
  return intake.start.inputMode === "BUTTON"
    ? basicInfoQuestions
    : [...symptomQuestions, ...basicInfoQuestions];
}

function isCompleted(intake: MockIntake): boolean {
  return intake.answers.length >= sequenceOf(intake).length;
}

function toQuestion(question: MockQuestion): IntakeQuestion {
  return {
    questionId: question.questionId,
    text: question.text,
    answerType: question.answerType,
    options: question.options?.map((option) => ({ ...option })) ?? null,
  };
}

function collectedOf(intake: MockIntake): string[] {
  const { inputMode, bodyPart, onset } = intake.start;
  const start =
    inputMode === "BUTTON"
      ? [
          bodyPart ? bodyPartLabels[bodyPart] : null,
          onset ? onsetLabels[onset] : null,
        ].filter((item): item is string => item !== null)
      : [];
  const labels = sequenceOf(intake);
  // 서버처럼 선택한 답은 문구만 보여 주고(증상 질문은 이름을 붙임), FREE_TEXT 답은 넣지 않습니다.
  const answered = intake.answers.flatMap((answer, index) => {
    const question = labels[index];
    if (question.answerType === "FREE_TEXT") return [];
    return [
      question.stage === "SYMPTOM"
        ? `${question.label}: ${answer.label}`
        : answer.label,
    ];
  });
  return [...start, ...answered];
}

function toIntakeResponse(intake: MockIntake, reask = false): IntakeResponse {
  const sequence = sequenceOf(intake);
  const current = sequence[intake.answers.length];
  const collected = collectedOf(intake);

  if (!current) {
    const total = basicInfoQuestions.length;
    return {
      intakeId: intake.intakeId,
      status: "COMPLETED",
      stage: "BASIC_INFO",
      progress: { current: total, total },
      collected,
      question: null,
      reask: false,
      emergency: null,
      department: { ...mockDepartment },
      summaryId: intake.summaryId,
    };
  }

  const sameStage = sequence.filter((item) => item.stage === current.stage);
  return {
    intakeId: intake.intakeId,
    status: "IN_PROGRESS",
    stage: current.stage,
    progress: {
      current: sameStage.indexOf(current) + 1,
      total: sameStage.length,
    },
    collected,
    question: toQuestion(current),
    reask,
    emergency: null,
    department: null,
    summaryId: null,
  };
}

export function startIntake(request: IntakeStartRequest): IntakeResponse {
  if (request.inputMode === "BUTTON") {
    if (!request.bodyPart) {
      throw badRequest("INTAKE_400", "bodyPart", "불편한 곳을 골라 주세요.");
    }
    if (!request.onset) {
      throw badRequest("INTAKE_400", "onset", "언제부터인지 골라 주세요.");
    }
  } else if (!request.text?.trim()) {
    throw badRequest("INTAKE_400", "text", "증상을 알려 주세요.");
  }

  serial += 1;
  const intake: MockIntake = {
    intakeId: mockUuid("3f2a9c1e", serial),
    start: { ...request },
    answers: [],
    summaryId: null,
  };
  intakes.set(intake.intakeId, intake);
  return toIntakeResponse(intake);
}

export function getIntake(intakeId: string): IntakeResponse {
  return toIntakeResponse(findIntake(intakeId));
}

export function answerIntake(
  intakeId: string,
  request: IntakeAnswerRequest,
): IntakeResponse {
  const intake = findIntake(intakeId);
  if (isCompleted(intake)) throw intakeConflict("COMPLETED");

  const question = sequenceOf(intake)[intake.answers.length];
  if (request.questionId !== question.questionId) throw intakeConflict(null);

  if (question.answerType === "FREE_TEXT") {
    // FREE_TEXT는 말·글로만 답할 수 있습니다. 서버처럼 BUTTON이면 400이고, 빈 답도 400입니다.
    if (request.inputMode === "BUTTON") {
      throw new ApiError("INTAKE_400", "글이나 말로 답해 주세요.", 400);
    }
    const text = request.answer.trim();
    if (text === "") {
      throw badRequest("INTAKE_400", "request", "답변을 입력해 주세요");
    }
    intake.answers.push({
      questionId: question.questionId,
      code: "",
      label: text,
    });
    if (isCompleted(intake)) createSummary(intake);
    return toIntakeResponse(intake);
  }

  const choices =
    question.answerType === "YES_NO_UNKNOWN"
      ? yesNoUnknownAnswers.map((code) => ({ code, label: yesNoLabels[code] }))
      : (question.options ?? []);
  const isButton = request.inputMode === "BUTTON";
  const matched = choices.find(
    (choice) =>
      choice.code === request.answer ||
      (!isButton && choice.label === request.answer),
  );

  if (!matched) {
    if (isButton) {
      throw badRequest("INTAKE_400", "answer", "선택지에 없는 답이에요.");
    }
    // 말·글을 알아듣지 못하면 같은 질문을 다시 묻습니다.
    return toIntakeResponse(intake, true);
  }

  intake.answers.push({
    questionId: question.questionId,
    code: matched.code,
    label: matched.label,
  });
  if (isCompleted(intake)) createSummary(intake);
  return toIntakeResponse(intake);
}

export function goBackIntake(intakeId: string): IntakeResponse {
  const intake = findIntake(intakeId);
  if (isCompleted(intake)) throw intakeConflict("COMPLETED");
  if (intake.answers.length === 0) {
    throw badRequest("INTAKE_400", "intakeId", "첫 질문이라 돌아갈 수 없어요.");
  }
  intake.answers.pop();
  return toIntakeResponse(intake);
}

// 서버처럼 문진과 요약지를 지웁니다. 이후 조회는 404입니다.
export function cancelIntake(intakeId: string): IntakeCancelResult {
  const intake = findIntake(intakeId);
  intakes.delete(intake.intakeId);
  if (intake.summaryId) summaries.delete(intake.summaryId);
  return { intakeId: intake.intakeId, status: "CANCELED" };
}

export function getIntakeDepartment(intakeId: string): IntakeDepartmentResult {
  const intake = intakes.get(intakeId);
  if (!intake) {
    throw new ApiError("DEPARTMENT_404", "문진을 찾을 수 없어요.", 404);
  }
  if (!isCompleted(intake)) {
    throw new ApiError("DEPARTMENT_409", "아직 끝나지 않은 문진이에요.", 409);
  }
  return { intakeId, ...mockDepartment };
}

// ---- 요약지 ----

// 건강 정보: 모른다고 하면 null, 없다고 하면 [], 있다고 하면 항목을 담습니다.
// 서버는 AI가 쓴 글을 이름과 설명으로 나눕니다. 가짜 응답은 첫 낱말을 이름, 나머지를 설명으로 둡니다.
const NONE_ANSWERS = new Set([
  "없어요",
  "없음",
  "없습니다",
  "아니요",
  "아니오",
]);
const UNKNOWN_ANSWERS = new Set(["잘 모르겠어요", "모르겠어요", "몰라요"]);

function healthInfoOf(
  intake: MockIntake,
  questionId: string,
): CollectedList<HealthInfoItem> {
  const text = intake.answers
    .find((answer) => answer.questionId === questionId)
    ?.label.trim();
  if (text === undefined || UNKNOWN_ANSWERS.has(text)) return null;
  if (NONE_ANSWERS.has(text)) return [];
  const [name, ...rest] = text.split(/\s+/);
  return [{ name, detail: rest.length > 0 ? rest.join(" ") : null }];
}

function buildContent(intake: MockIntake): SummaryContent {
  const { inputMode, bodyPart, onset, text } = intake.start;
  const codeOf = (questionId: string) =>
    intake.answers.find((answer) => answer.questionId === questionId)?.code;
  const ageGroup = codeOf("q_age_group");
  const gender = codeOf("q_gender");

  const items = symptomQuestions.flatMap((question, index) => {
    const code = codeOf(question.questionId);
    if (code === undefined) return [];
    const value = code === "YES" ? "있음" : code === "NO" ? "없음" : null;
    return [
      {
        order: index + 1,
        label: question.label,
        question: question.text,
        value,
      },
    ];
  });

  return {
    ageGroup: isEnumValue(ageGroups, ageGroup) ? ageGroup : "SIXTIES",
    gender: isEnumValue(genders, gender) ? gender : "MALE",
    inputMode,
    mainSymptom:
      inputMode === "BUTTON"
        ? `${bodyPart ? bodyPartLabels[bodyPart] : "불편한 곳"} 불편`
        : (text ?? "").trim().slice(0, 100),
    bodyPart: bodyPart ?? null,
    onset: onset ?? null,
    onsetDetail: inputMode === "BUTTON" && onset ? onsetLabels[onset] : null,
    extraNote: inputMode === "BUTTON" ? (text ?? null) : null,
    medications: healthInfoOf(intake, "q_medications"),
    conditions: healthInfoOf(intake, "q_conditions"),
    allergies: healthInfoOf(intake, "q_allergies"),
    items,
    department: { ...mockDepartment },
    isConfirmed: false,
  };
}

// 가짜 문진에는 응급 전환 흐름이 없어 서버의 SUMMARY_404·409 없이 어떤 문진 ID든 샘플을 돌려줍니다.
// 건강 정보의 세 상태(null, [], 항목 있음)를 한 화면에서 확인할 수 있게 채웁니다.
export function getEmergencyCard(intakeId: string): EmergencyCardResponse {
  return {
    intakeId,
    createdAt: SUMMARY_CREATED_AT,
    userUtterance: "가슴이 답답해요",
    redFlagCategory: "CHEST_PAIN",
    mainSymptom: "가슴 답답함",
    onsetDetail: "오늘",
    ageGroup: "SEVENTIES",
    gender: "FEMALE",
    medications: [{ name: "OO약", detail: null }],
    conditions: [],
    allergies: null,
    guardian: { relation: "DAUGHTER", phoneNumber: "010-0000-0000" },
  };
}

// 요약지 실패 흐름을 화면에서 볼 수 있게 하는 규칙입니다(새 환경 변수 없이 입력으로 정합니다).
// - BUTTON으로 시작하고 bodyPart가 ETC인 문진은 첫 생성이 FAILED가 됩니다(3번째 조회부터).
// - FAILED일 때만 다시 만들 수 있고, 다시 만들면 정상으로 DONE까지 갑니다.
// - GENERATING·DONE인 요약지를 다시 만들면 서버처럼 SUMMARY_409입니다.
const FAILED_AT_POLL = 3;

function createSummary(intake: MockIntake) {
  // 문진 ID의 앞 8자리만 바꿔 문진마다 다른 요약지 ID를 만듭니다.
  const summaryId = intake.intakeId.replace(/^[0-9a-f]{8}/, "8b1d2e3f");
  intake.summaryId = summaryId;
  summaries.set(summaryId, {
    summaryId,
    intakeId: intake.intakeId,
    polls: 0,
    failing:
      intake.start.inputMode === "BUTTON" && intake.start.bodyPart === "ETC",
    content: buildContent(intake),
  });
}

function findSummary(summaryId: string): MockSummary {
  const record = summaries.get(summaryId);
  if (!record) {
    throw new ApiError("SUMMARY_404", "요약지를 찾을 수 없어요.", 404);
  }
  return record;
}

function statusOf(record: MockSummary): SummaryStatus {
  if (record.failing && record.polls >= FAILED_AT_POLL) return "FAILED";
  return record.polls > summarySteps.length ? "DONE" : "GENERATING";
}

// 조회할 때마다 한 단계씩 진행하고, 4단계가 끝난 다음 조회에서 DONE이 됩니다.
// 실패하는 요약지는 실패한 시점의 단계에서 멈춥니다.
function stepsOf(record: MockSummary): SummaryStepState[] {
  const polls = record.failing
    ? Math.min(record.polls, FAILED_AT_POLL - 1)
    : record.polls;
  return summarySteps.map((step, index) => ({
    step,
    status:
      index < polls - 1
        ? "DONE"
        : index === polls - 1
          ? "IN_PROGRESS"
          : "WAITING",
  }));
}

function toSummaryResponse(record: MockSummary): SummaryResponse {
  const status = statusOf(record);
  return {
    summaryId: record.summaryId,
    intakeId: record.intakeId,
    status,
    steps: stepsOf(record),
    summary: status === "DONE" ? structuredClone(record.content) : null,
    createdAt: SUMMARY_CREATED_AT,
  };
}

// 생성 중이거나 실패한 요약지는 수정·확인할 수 없습니다.
function requireDone(record: MockSummary) {
  if (statusOf(record) === "DONE") return;
  throw new ApiError("SUMMARY_409", "아직 요약지를 만드는 중이에요.", 409);
}

export function getSummary(summaryId: string): SummaryResponse {
  const record = findSummary(summaryId);
  record.polls += 1;
  return toSummaryResponse(record);
}

export function updateSummary(
  summaryId: string,
  request: SummaryUpdateRequest,
): SummaryResponse {
  const record = findSummary(summaryId);
  requireDone(record);

  const { items = [], ...fields } = request;
  const content = record.content;
  for (const item of items) {
    if (!content.items.some((current) => current.order === item.order)) {
      throw badRequest("SUMMARY_400", "items", "없는 항목이에요.");
    }
  }

  const changes = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );
  Object.assign(content, Object.fromEntries(changes));
  if (request.onset !== undefined && request.onsetDetail === undefined) {
    content.onsetDetail = request.onset ? onsetLabels[request.onset] : null;
  }
  for (const item of items) {
    const target = content.items.find(
      (current) => current.order === item.order,
    );
    if (target) target.value = item.value;
  }
  content.isConfirmed = false;
  return toSummaryResponse(record);
}

export function confirmSummary(summaryId: string): SummaryConfirmResult {
  const record = findSummary(summaryId);
  requireDone(record);
  record.content.isConfirmed = true;
  return { summaryId, isConfirmed: true };
}

// FAILED인 요약지만 다시 만들 수 있습니다. 만드는 중이거나 이미 끝났으면 SUMMARY_409입니다.
// ETC로 시작해 실패한 요약지도 다시 만들면 성공합니다.
export function retrySummary(intakeId: string): SummaryRetryResult {
  const intake = intakes.get(intakeId);
  if (!intake) {
    throw new ApiError("SUMMARY_404", "문진을 찾을 수 없어요.", 404);
  }
  if (!intake.summaryId || !isCompleted(intake)) {
    throw new ApiError("SUMMARY_409", "아직 끝나지 않은 문진이에요.", 409);
  }
  const record = findSummary(intake.summaryId);
  if (statusOf(record) !== "FAILED") {
    throw new ApiError(
      "SUMMARY_409",
      "요약지를 만드는 중이거나 이미 만들었어요.",
      409,
    );
  }
  record.polls = 0;
  record.failing = false;
  record.content = buildContent(intake);
  return { intakeId, summaryId: record.summaryId, status: "GENERATING" };
}
