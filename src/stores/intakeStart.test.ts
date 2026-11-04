import { describe, expect, it } from "vitest";
import { bodyParts, onsets } from "@/api/enums";
import { appActions, getAppState } from "@/stores/appStore";
import {
  bodyPartOptions,
  createButtonIntakeRequest,
  onsetOptions,
} from "@/stores/intakeStart";

describe("createButtonIntakeRequest", () => {
  it("화면 선택 값을 enum으로 바꿔 버튼 입력 요청을 만든다", () => {
    expect(
      createButtonIntakeRequest({
        symptom: "다리 · 무릎",
        duration: "2~3일",
        detail: "  계단을 오를 때 더 아파요 ",
      }),
    ).toEqual({
      inputMode: "BUTTON",
      bodyPart: "LEG_KNEE",
      onset: "DAYS_2_3",
      text: "계단을 오를 때 더 아파요",
    });
  });

  it("더 알려주실 내용이 비어 있으면 text를 보내지 않는다", () => {
    for (const detail of [undefined, "", "   "]) {
      expect(
        createButtonIntakeRequest({
          symptom: "머리",
          duration: "오늘",
          detail,
        }),
      ).toEqual({ inputMode: "BUTTON", bodyPart: "HEAD", onset: "TODAY" });
    }
  });

  it("부위나 시작 시점이 없거나 목록에 없는 값이면 null이다", () => {
    expect(createButtonIntakeRequest({ duration: "오늘" })).toBeNull();
    expect(createButtonIntakeRequest({ symptom: "머리" })).toBeNull();
    expect(
      createButtonIntakeRequest({ symptom: "무릎", duration: "오늘" }),
    ).toBeNull();
  });

  it("선택지가 API enum을 빠짐없이 한 번씩 쓴다", () => {
    expect(bodyPartOptions.map((option) => option.value)).toEqual([
      ...bodyParts,
    ]);
    expect(onsetOptions.map((option) => option.value)).toEqual([...onsets]);
  });
});

describe("문진 시작 요청 상태", () => {
  it("다음을 누르면 저장하고, 문진을 처음부터 시작하면 지운다", () => {
    appActions.prepareIntake({
      inputMode: "BUTTON",
      bodyPart: "HEAD",
      onset: "TODAY",
    });
    expect(getAppState().intakeStart).toEqual({
      inputMode: "BUTTON",
      bodyPart: "HEAD",
      onset: "TODAY",
    });

    appActions.startInterview();
    expect(getAppState().intakeStart).toBeNull();
  });
});
