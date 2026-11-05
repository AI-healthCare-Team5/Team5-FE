import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR, SERVER_ERROR_MESSAGE } from "@/api/errors";
import { getEmergencyCard, type EmergencyCard } from "@/api/intakes";
import {
  buildEmergencyCardRows,
  formatCardTime,
  formatGuardian,
  guardianTelHref,
  loadEmergencyCard,
} from "@/pages/emergency-card/emergencyCard";

vi.mock("@/api/intakes", () => ({ getEmergencyCard: vi.fn() }));

// 실제 백엔드가 아니라 API 함수를 가짜로 바꿔 서버 응답별 처리를 확인합니다. 모든 값은 가짜 데이터입니다.
const getCardMock = vi.mocked(getEmergencyCard);

const card: EmergencyCard = {
  intakeId: "3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d",
  createdAt: "2026-10-30T10:52:00+09:00",
  userUtterance: "가슴이 조이고 식은땀이 나요",
  redFlagCategory: "CHEST_PAIN",
  mainSymptom: "가슴이 조이고 식은땀이 남",
  onsetDetail: "약 10분 전",
  ageGroup: "SEVENTIES",
  gender: "FEMALE",
  medications: [{ name: "혈압약", detail: "매일 아침" }],
  conditions: [],
  allergies: null,
  guardian: { relation: "DAUGHTER", phoneNumber: "010-0000-0000" },
};

const valueOf = (
  rows: ReturnType<typeof buildEmergencyCardRows>,
  key: string,
) => rows.find((row) => row.key === key);

beforeEach(() => {
  getCardMock.mockReset();
});

describe("buildEmergencyCardRows", () => {
  it("디자인 순서대로 7개 항목을 놓는다", () => {
    expect(
      buildEmergencyCardRows(card, "강원 홍천군 OO읍").map((row) => row.label),
    ).toEqual([
      "주된 증상",
      "시작 시점",
      "나이 · 성별",
      "복용 중인 약",
      "앓고 있는 병",
      "알레르기",
      "현재 위치",
    ]);
  });

  it("null은 흐린 '확인 못 했어요', []는 '없음'으로 보여 준다", () => {
    const rows = buildEmergencyCardRows(card, "강원 홍천군 OO읍");
    expect(valueOf(rows, "ageGender")).toMatchObject({
      value: "70대 · 여성",
      unchecked: false,
    });
    expect(valueOf(rows, "medications")?.value).toBe("혈압약 (매일 아침)");
    expect(valueOf(rows, "conditions")).toMatchObject({
      value: "없음",
      unchecked: false,
    });
    expect(valueOf(rows, "allergies")).toMatchObject({
      value: "확인 못 했어요",
      unchecked: true,
    });
    expect(valueOf(rows, "location")?.value).toBe("강원 홍천군 OO읍");
  });

  it("카드가 없으면(미리 보기) 위치 말고는 모두 '확인 못 했어요'다", () => {
    const rows = buildEmergencyCardRows(null, "강원 홍천군 OO읍");
    expect(
      rows
        .filter((row) => row.key !== "location")
        .every((row) => row.unchecked),
    ).toBe(true);
    expect(valueOf(rows, "location")?.unchecked).toBe(false);
  });

  it("주소가 없으면 현재 위치는 '확인 못 했어요'다", () => {
    expect(
      valueOf(buildEmergencyCardRows(card, null), "location"),
    ).toMatchObject({ value: "확인 못 했어요", unchecked: true });
  });
});

describe("보호자 연락처", () => {
  it("관계와 번호를 함께 보여 준다", () => {
    expect(formatGuardian(card.guardian!)).toBe("딸 · 010-0000-0000");
    expect(
      formatGuardian({ relation: "ETC", phoneNumber: "010-1111-2222" }),
    ).toBe("가족 · 지인 · 010-1111-2222");
  });

  it("전체 번호면 전화를 걸고, 가린 번호면 걸지 않는다", () => {
    expect(guardianTelHref(card.guardian!)).toBe("tel:01000000000");
    expect(
      guardianTelHref({ relation: "SON", phoneNumber: "010-****-5678" }),
    ).toBeNull();
  });
});

describe("formatCardTime", () => {
  it("한국 시각의 시:분으로 보여 준다", () => {
    expect(formatCardTime("2026-10-30T10:52:00+09:00")).toBe("10:52");
    expect(formatCardTime("2026-10-30T01:05:00Z")).toBe("10:05");
  });
});

describe("loadEmergencyCard", () => {
  it("받은 카드를 돌려준다", async () => {
    getCardMock.mockResolvedValue(card);
    await expect(loadEmergencyCard(card.intakeId)).resolves.toEqual({
      kind: "loaded",
      card,
    });
  });

  it("문진이 없거나 내 것이 아니면(SUMMARY_403·404) 처음으로 보낸다", async () => {
    getCardMock.mockRejectedValue(new ApiError("SUMMARY_404", "없어요", 404));
    await expect(loadEmergencyCard(card.intakeId)).resolves.toEqual({
      kind: "gone",
    });
    getCardMock.mockRejectedValue(new ApiError("SUMMARY_403", "아니에요", 403));
    await expect(loadEmergencyCard(card.intakeId)).resolves.toEqual({
      kind: "gone",
    });
  });

  it("로그인이 풀렸으면(AUTH_401) 비로그인으로 한 번 더 받는다", async () => {
    const guestCard = { ...card, guardian: null };
    getCardMock
      .mockRejectedValueOnce(new ApiError("AUTH_401", "로그인", 401))
      .mockResolvedValueOnce(guestCard);

    await expect(loadEmergencyCard(card.intakeId)).resolves.toEqual({
      kind: "loaded",
      card: guestCard,
    });
    expect(getCardMock).toHaveBeenCalledTimes(2);
  });

  it("그 밖의 실패는 다시 시도할 수 있게 문장과 함께 돌려준다", async () => {
    getCardMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));
    await expect(loadEmergencyCard(card.intakeId)).resolves.toEqual({
      kind: "failed",
      message: SERVER_ERROR_MESSAGE,
    });
  });

  it("코드 실수는 그대로 던진다", async () => {
    getCardMock.mockRejectedValue(new TypeError("oops"));
    await expect(loadEmergencyCard(card.intakeId)).rejects.toThrow(TypeError);
  });
});
