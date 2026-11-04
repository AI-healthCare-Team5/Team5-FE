// VITE_API_MOCK=true일 때 쓰는 가짜 응답입니다. 서버가 돌려주는 모양(Swagger)과 같게 만듭니다.
// 문진과 요약지는 한 흐름이라 상태를 함께 둡니다. 새로고침하면 상태가 사라집니다.
// 병원명은 OO·△△·XX, 전화번호는 000-0000-0000처럼 실제 정보가 아닌 값만 씁니다.
import {
  ageGroups,
  genders,
  isEnumValue,
  relations,
  summarySteps,
  yesNoUnknownAnswers,
  type BodyPart,
  type IntakeStage,
  type IntakeStatus,
  type Onset,
  type SummaryStatus,
  type YesNoUnknown,
} from "@/api/enums";
import type { KakaoLoginResult } from "@/api/auth";
import type { ConsentResult } from "@/api/consents";
import { ApiError } from "@/api/errors";
import type { GuardianRequest, GuardianResult } from "@/api/guardians";
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
  IntakeEmergency,
  IntakeQuestion,
  IntakeResponse,
  IntakeStartRequest,
} from "@/api/intakes";
import type {
  HealthInfoItem,
  SummaryConfirmResult,
  SummaryContent,
  SummaryResponse,
  SummaryRetryResult,
  SummaryStepState,
  SummaryUpdateRequest,
} from "@/api/summaries";
import type { MemberInfo } from "@/api/members";
import type {
  DeleteRecordResult,
  RecordDetail,
  RecordListResult,
  SaveRecordResult,
} from "@/api/records";
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
  // 응급 전환된 문진이면 채웁니다. 그 뒤로는 서버처럼 답변·이전 질문을 받지 않습니다.
  emergency: IntakeEmergency | null;
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

// 가짜 응답에서 응급 전환(E01)을 볼 수 있게 하는 규칙입니다. 서버의 위험 신호 규칙을 흉내 내지 않습니다.
// 시작할 때 보낸 글(S04 "더 알려주실 내용")이나 글·말로 한 답에 이 문구가 있으면 EMERGENCY로 응답합니다.
const MOCK_EMERGENCY_TEXT = "가슴이 답답";

function mockEmergencyOf(
  text: string | null | undefined,
): IntakeEmergency | null {
  const utterance = text?.trim() ?? "";
  if (!utterance.includes(MOCK_EMERGENCY_TEXT)) return null;
  return { userUtterance: utterance, redFlagCategory: "CHEST_PAIN" };
}

// 끝났거나 응급 전환된 문진은 서버처럼 INTAKE_409와 그 상태를 돌려줍니다.
function requireInProgress(intake: MockIntake) {
  if (intake.emergency) throw intakeConflict("EMERGENCY");
  if (isCompleted(intake)) throw intakeConflict("COMPLETED");
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

  if (intake.emergency) {
    // 응급 전환된 문진은 질문 없이 응급 정보만 돌려줍니다. 단계와 진행은 멈춘 자리 그대로입니다.
    const stage = current?.stage ?? "BASIC_INFO";
    const sameStage = sequence.filter((item) => item.stage === stage);
    return {
      intakeId: intake.intakeId,
      status: "EMERGENCY",
      stage,
      progress: {
        current: current ? sameStage.indexOf(current) + 1 : sameStage.length,
        total: sameStage.length,
      },
      collected,
      question: null,
      reask: false,
      emergency: { ...intake.emergency },
      department: null,
      summaryId: null,
    };
  }

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
    emergency: mockEmergencyOf(request.text),
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
  requireInProgress(intake);

  const question = sequenceOf(intake)[intake.answers.length];
  if (request.questionId !== question.questionId) throw intakeConflict(null);

  // 글·말로 한 답도 시작할 때와 같은 규칙으로 응급 전환을 봅니다. 버튼 답(code)은 보지 않습니다.
  if (request.inputMode !== "BUTTON") {
    const emergency = mockEmergencyOf(request.answer);
    if (emergency) {
      intake.emergency = emergency;
      return toIntakeResponse(intake);
    }
  }

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
  requireInProgress(intake);
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

// ---- 회원·기록 ----

// 서버 설정의 현재 동의 문구 버전입니다. 프론트가 다른 버전을 보내면 400을 돌려주려고 프론트 상수와 따로 둡니다.
const MOCK_POLICY_VERSION = "v1";

interface MockGuardian {
  guardianId: number;
  relation: GuardianRequest["relation"];
  // 숫자만 담습니다. 응답에서는 가운데를 가립니다.
  phoneNumber: string;
}

interface MockConsent {
  consentId: number;
  agreedAt: string;
}

interface MockRecord {
  medicalRecordId: number;
  createdAt: string;
  content: SummaryContent;
}

const member = {
  loggedIn: false,
  // 첫 로그인에서 예시 기록을 한 번만 넣습니다. 탈퇴한 뒤 다시 로그인해도 기록은 돌아오지 않습니다.
  seeded: false,
  recordConsent: null as MockConsent | null,
  guardianConsent: null as MockConsent | null,
  guardian: null as MockGuardian | null,
};
const records = new Map<number, MockRecord>();
// 보관한 요약지 ID입니다. 보관하면 요약지를 지우지만 다시 보관하려 하면 기록 ID를 돌려주려고 남깁니다.
const savedSummaries = new Map<string, number>();
let consentSerial = 0;
let guardianSerial = 0;
let recordSerial = 0;

function requireLogin() {
  if (!member.loggedIn) {
    throw new ApiError("AUTH_401", "로그인이 필요해요.", 401);
  }
}

// 서버가 H01 두 번째 줄을 만드는 방식(onsetDetail과 첫 번째 증상별 항목)을 흉내 냅니다.
function recordSubtitle(content: SummaryContent): string {
  const first = [...content.items]
    .sort((a, b) => a.order - b.order)
    .find((item) => item.value !== null);
  return [content.onsetDetail, first && `${first.label} ${first.value}`]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

function maskPhoneNumber(digits: string): string {
  const stars = "*".repeat(digits.length - 7);
  return `${digits.slice(0, 3)}-${stars}-${digits.slice(-4)}`;
}

function toGuardian(guardian: MockGuardian) {
  return {
    relation: guardian.relation,
    phoneNumber: maskPhoneNumber(guardian.phoneNumber),
  };
}

function addRecord(createdAt: string, content: SummaryContent): MockRecord {
  recordSerial += 1;
  const record = { medicalRecordId: recordSerial, createdAt, content };
  records.set(record.medicalRecordId, record);
  return record;
}

// 화면 확인용 예시 기록입니다. 모두 지어낸 값입니다.
function seedRecords() {
  const base: SummaryContent = {
    ageGroup: "SEVENTIES",
    gender: "FEMALE",
    inputMode: "VOICE",
    mainSymptom: "어지러움",
    bodyPart: "HEAD",
    onset: "DAYS_2_3",
    onsetDetail: "이틀 전부터",
    extraNote: null,
    // 묻지 못한 항목(null)이 있는 기록입니다.
    medications: null,
    conditions: null,
    allergies: [],
    items: [],
    department: { ...mockDepartment, departmentName: "내과" },
    isConfirmed: false,
  };
  addRecord("2026-09-03T10:00:00+09:00", base);
  addRecord("2026-09-28T10:00:00+09:00", {
    ...structuredClone(base),
    mainSymptom: "기침",
    bodyPart: "CHEST",
    onset: "OVER_WEEK",
    onsetDetail: "일주일 전부터",
    // 건강 정보를 모두 "없음"([])으로 답한 기록입니다.
    medications: [],
    conditions: [],
  });
  addRecord("2026-10-16T10:00:00+09:00", {
    ...structuredClone(base),
    mainSymptom: "무릎 통증",
    bodyPart: "LEG_KNEE",
    onset: "DAYS_2_3",
    onsetDetail: "3일 전부터",
    medications: [{ name: "혈압약", detail: "매일 아침" }],
    conditions: [{ name: "고혈압", detail: null }],
    allergies: [{ name: "약", detail: "페니실린" }],
    items: [
      { order: 1, label: "붓기", question: "무릎이 부었나요?", value: "있음" },
      {
        order: 2,
        label: "넘어진 적",
        question: "최근에 넘어지신 적이 있나요?",
        value: "없음",
      },
    ],
    department: { ...mockDepartment },
  });
}

// 카카오 로그인입니다. 가짜 응답에서는 카카오를 거치지 않습니다.
export function loginMember(): KakaoLoginResult {
  const isNewMember = !member.seeded;
  if (!member.seeded) {
    seedRecords();
    member.seeded = true;
  }
  member.loggedIn = true;
  return {
    memberId: 1,
    nickname: "봄날",
    isNewMember,
    needsRecordConsent: member.recordConsent === null,
  };
}

// 서버처럼 로그아웃하면 이 브라우저의 문진·요약지도 지웁니다.
export function logoutMember() {
  member.loggedIn = false;
  intakes.clear();
  summaries.clear();
}

export function getMyInfo(): MemberInfo {
  requireLogin();
  const status = (consent: MockConsent | null) => ({
    agreed: consent !== null,
    policyVersion: consent ? MOCK_POLICY_VERSION : null,
    agreedAt: consent?.agreedAt ?? null,
  });
  return {
    memberId: 1,
    nickname: "봄날",
    provider: "KAKAO",
    consents: {
      record: status(member.recordConsent),
      guardian: status(member.guardianConsent),
    },
    recordCount: records.size,
    guardian: member.guardian ? toGuardian(member.guardian) : null,
  };
}

// 기록·보호자를 지우고 동의를 모두 거둡니다. 다시 로그인해도 기록은 돌아오지 않습니다.
export function withdrawMember() {
  requireLogin();
  records.clear();
  savedSummaries.clear();
  member.recordConsent = null;
  member.guardianConsent = null;
  member.guardian = null;
  logoutMember();
}

export function agreeToRecordConsent(request: {
  consentType: string;
  policyVersion: string;
}): ConsentResult {
  requireLogin();
  if (request.consentType !== "RECORD") {
    throw badRequest(
      "CONSENT_400",
      "consentType",
      "RECORD만 동의할 수 있어요.",
    );
  }
  if (request.policyVersion !== MOCK_POLICY_VERSION) {
    throw badRequest(
      "CONSENT_400",
      "policyVersion",
      "동의 문구 버전이 달라요.",
    );
  }
  // 이미 같은 버전에 동의해 있으면 기존 동의를 그대로 돌려줍니다(CONSENT_200).
  if (member.recordConsent === null) {
    consentSerial += 1;
    member.recordConsent = {
      consentId: consentSerial,
      agreedAt: new Date().toISOString(),
    };
  }
  return {
    consentId: member.recordConsent.consentId,
    consentType: "RECORD",
    policyVersion: MOCK_POLICY_VERSION,
    agreedAt: member.recordConsent.agreedAt,
  };
}

export function saveGuardian(request: GuardianRequest): GuardianResult {
  requireLogin();
  const errors: { field: string; reason: string }[] = [];
  if (!(relations as readonly string[]).includes(request.relation)) {
    errors.push({ field: "relation", reason: "관계를 선택해 주세요" });
  }
  if (!/^\d{10,11}$/.test(request.phoneNumber)) {
    errors.push({ field: "phoneNumber", reason: "숫자 10~11자리여야 해요" });
  }
  if (request.consentAgreed !== true) {
    errors.push({ field: "consentAgreed", reason: "동의에 체크해 주세요" });
  }
  if (request.policyVersion !== MOCK_POLICY_VERSION) {
    errors.push({ field: "policyVersion", reason: "동의 문구 버전이 달라요" });
  }
  if (errors.length > 0) {
    throw new ApiError("GUARDIAN_400", "입력을 확인해 주세요.", 400, {
      errors,
    });
  }
  // 회원당 보호자는 1명이라 항상 덮어씁니다.
  guardianSerial += 1;
  member.guardian = {
    guardianId: member.guardian?.guardianId ?? guardianSerial,
    relation: request.relation,
    phoneNumber: request.phoneNumber,
  };
  consentSerial += 1;
  member.guardianConsent = {
    consentId: consentSerial,
    agreedAt: new Date().toISOString(),
  };
  return {
    guardianId: member.guardian.guardianId,
    ...toGuardian(member.guardian),
  };
}

// 보호자를 지우면 보호자 연락처 저장 동의도 함께 거둡니다.
export function deleteGuardian() {
  requireLogin();
  if (!member.guardian) {
    throw new ApiError("GUARDIAN_404", "등록된 보호자가 없어요.", 404);
  }
  member.guardian = null;
  member.guardianConsent = null;
}

// 요약지를 기록으로 복사하고 요약지·문진은 지웁니다. 이미 보관한 요약지는 기록 ID와 함께 SUMMARY_409입니다.
export function saveSummaryToRecords(summaryId: string): SaveRecordResult {
  requireLogin();
  if (member.recordConsent === null) {
    throw new ApiError("CONSENT_403", "기록 저장에 동의해 주세요.", 403);
  }
  const savedId = savedSummaries.get(summaryId);
  if (savedId !== undefined) {
    throw new ApiError("SUMMARY_409", "이미 보관한 요약지예요.", 409, {
      medicalRecordId: savedId,
    });
  }
  const summary = findSummary(summaryId);
  if (statusOf(summary) !== "DONE") {
    throw new ApiError("SUMMARY_409", "아직 요약지를 만드는 중이에요.", 409);
  }
  const savedAt = new Date().toISOString();
  const record = addRecord(savedAt, structuredClone(summary.content));
  savedSummaries.set(summaryId, record.medicalRecordId);
  summaries.delete(summaryId);
  intakes.delete(summary.intakeId);
  return { medicalRecordId: record.medicalRecordId, savedAt };
}

export function listRecords(params: {
  page: number;
  size: number;
}): RecordListResult {
  requireLogin();
  const { page, size } = params;
  if (!Number.isInteger(page) || page < 0) {
    throw badRequest("SUMMARY_400", "page", "0 이상이어야 해요.");
  }
  if (!Number.isInteger(size) || size < 1 || size > 50) {
    throw badRequest("SUMMARY_400", "size", "1에서 50 사이여야 해요.");
  }
  // 최근 순입니다. 기록 ID는 보관한 순서대로 커집니다.
  const all = [...records.values()].sort(
    (a, b) => b.medicalRecordId - a.medicalRecordId,
  );
  const start = page * size;
  return {
    page,
    size,
    totalCount: all.length,
    hasNext: start + size < all.length,
    records: all.slice(start, start + size).map((record) => ({
      medicalRecordId: record.medicalRecordId,
      createdAt: record.createdAt,
      departmentName: record.content.department.departmentName,
      mainSymptom: record.content.mainSymptom,
      subtitle: recordSubtitle(record.content),
    })),
  };
}

function findRecord(medicalRecordId: number): MockRecord {
  const record = records.get(medicalRecordId);
  if (!record) {
    throw new ApiError("SUMMARY_404", "기록을 찾을 수 없어요.", 404);
  }
  return record;
}

export function getRecord(medicalRecordId: number): RecordDetail {
  requireLogin();
  const record = findRecord(medicalRecordId);
  return {
    medicalRecordId,
    createdAt: record.createdAt,
    summary: structuredClone(record.content),
  };
}

export function deleteRecord(medicalRecordId: number): DeleteRecordResult {
  requireLogin();
  findRecord(medicalRecordId);
  records.delete(medicalRecordId);
  return { medicalRecordId };
}
