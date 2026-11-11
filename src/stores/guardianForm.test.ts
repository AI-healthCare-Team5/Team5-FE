import { describe, expect, it } from "vitest";
import { relations } from "@/api/enums";
import {
  createGuardianInput,
  emptyGuardianForm,
  missingGuardianFields,
  missingGuardianMessage,
  relationOptions,
  toGuardianSaveResult,
  toPhoneDigits,
  type GuardianForm,
} from "@/stores/guardianForm";

const filled: GuardianForm = {
  relation: "DAUGHTER",
  phoneNumber: "01000000000",
  consentAgreed: true,
};

describe("보호자 입력", () => {
  it("관계 선택지가 API enum을 빠짐없이 한 번씩 쓴다", () => {
    expect(relationOptions.map((option) => option.value)).toEqual([
      ...relations,
    ]);
    expect(relationOptions.at(-1)).toEqual({
      value: "ETC",
      label: "가족 · 지인",
    });
  });

  it("전화번호는 하이픈·공백을 빼고 숫자 11자리까지만 남긴다", () => {
    expect(toPhoneDigits("010-0000 0000")).toBe("01000000000");
    expect(toPhoneDigits("010000000001234")).toBe("01000000000");
  });

  it("전화번호는 숫자 10~11자리만 통과한다", () => {
    for (const phoneNumber of ["0310000000", "01000000000"]) {
      expect(missingGuardianFields({ ...filled, phoneNumber })).toEqual([]);
    }
    for (const phoneNumber of ["", "010000000"]) {
      expect(missingGuardianFields({ ...filled, phoneNumber })).toEqual([
        "phoneNumber",
      ]);
    }
  });

  it("빠진 항목만 저장 버튼 아래에 안내한다", () => {
    expect(
      missingGuardianMessage(missingGuardianFields(emptyGuardianForm)),
    ).toBe("관계, 전화번호, 동의를 확인해 주세요");
    expect(
      missingGuardianMessage(
        missingGuardianFields({ ...filled, consentAgreed: false }),
      ),
    ).toBe("동의를 확인해 주세요");
    expect(missingGuardianMessage([])).toBeNull();
  });

  it("다 채우면 숫자만 담은 요청 본문을 만들고, 빠지면 null이다", () => {
    expect(createGuardianInput(filled)).toEqual({
      relation: "DAUGHTER",
      phoneNumber: "01000000000",
      consentAgreed: true,
    });
    expect(createGuardianInput({ ...filled, relation: null })).toBeNull();
  });
});

describe("toGuardianSaveResult", () => {
  it("저장됐으면 saved로 옮긴다", () => {
    expect(toGuardianSaveResult({ kind: "saved" })).toEqual({ kind: "saved" });
  });

  it("GUARDIAN_400의 field마다 해당 칸 아래 안내를 붙인다", () => {
    expect(
      toGuardianSaveResult({
        kind: "invalid",
        message: "입력값을 확인해 주세요.",
        fieldErrors: [
          { field: "phoneNumber", reason: "숫자 10~11자리" },
          { field: "consentAgreed", reason: "동의 필요" },
          { field: "relation", reason: "관계 필요" },
        ],
      }),
    ).toEqual({
      kind: "invalid",
      fieldErrors: {
        relation: "누구인지 다시 골라 주세요",
        phoneNumber: "전화번호를 숫자 10~11자리로 눌러 주세요",
        consentAgreed: "보호자 연락처 저장에 동의해 주세요",
      },
      message: null,
    });
  });

  it("현재 버전이 아닌 policyVersion은 칸이 없어 동의 내용을 다시 보라고 안내한다", () => {
    expect(
      toGuardianSaveResult({
        kind: "invalid",
        message: "입력값을 확인해 주세요.",
        fieldErrors: [{ field: "policyVersion", reason: "현재 버전 아님" }],
      }),
    ).toEqual({
      kind: "invalid",
      fieldErrors: {},
      message:
        "동의 내용이 바뀌었어요. 내용 보기에서 다시 확인하고 저장해 주세요.",
    });
  });

  it("errors가 비었거나 알 수 없는 칸이면 서버 안내 문장을 보여 준다", () => {
    for (const fieldErrors of [[], [{ field: "etc", reason: "?" }]]) {
      expect(
        toGuardianSaveResult({
          kind: "invalid",
          message: "서버 안내 문장",
          fieldErrors,
        }),
      ).toEqual({
        kind: "invalid",
        fieldErrors: {},
        message: "서버 안내 문장",
      });
    }
  });

  it("로그인 필요와 그 밖의 실패를 옮긴다", () => {
    expect(toGuardianSaveResult({ kind: "needsLogin" })).toEqual({
      kind: "needsLogin",
    });
    expect(
      toGuardianSaveResult({ kind: "failed", message: "네트워크" }),
    ).toEqual({ kind: "error", message: "네트워크" });
  });
});
