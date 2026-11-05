import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  initialLoadingView,
  type SummaryLoadingView,
} from "@/pages/summary-loading/summaryLoading";
import { SummaryLoadingContent } from "@/pages/summary-loading/components/SummaryLoadingContent";

// 정적 마크업만 확인합니다(저장소에 DOM 테스트 도구가 없습니다). 동작은 summaryLoading.test.ts에서 확인합니다.
function render(patch: Partial<SummaryLoadingView> = {}) {
  return renderToStaticMarkup(
    <SummaryLoadingContent
      view={{ ...initialLoadingView, ...patch }}
      onRetry={() => {}}
      onCancel={() => {}}
    />,
  );
}

// 라벨이 같은 버튼의 속성 문자열을 돌려줍니다. 없으면 null입니다.
function buttonAttributes(html: string, label: string): string | null {
  const match = new RegExp(`<button([^>]*)>${label}</button>`).exec(html);
  return match ? match[1] : null;
}

const steps = [
  { step: "BASIC_INFO", status: "DONE" },
  { step: "SYMPTOM", status: "IN_PROGRESS" },
  { step: "HEALTH_INFO", status: "WAITING" },
  { step: "DEPARTMENT", status: "WAITING" },
] as const;

describe("S06a 만드는 중", () => {
  it("서버 단계 4개를 기존 문구와 상태로 보여 준다", () => {
    const html = render({ steps: [...steps] });

    for (const label of [
      "나이대 · 성별 정리",
      "증상과 기간 정리",
      "복용약 · 병력 정리",
      "진료과 확인",
    ]) {
      expect(html).toContain(label);
    }
    expect(html.match(/<li /g)).toHaveLength(4);
    expect(html).toContain(">완료<");
    expect(html).toContain(">하는 중<");
    expect(html.match(/>대기</g)).toHaveLength(2);
    expect(html).not.toContain("요약지 완성");
  });

  it("스크린리더에는 지금 하는 단계를 알려 준다", () => {
    expect(render({ steps: [...steps] })).toContain(
      '<span class="sr-only">증상과 기간 정리 하는 중</span>',
    );
  });

  it("첫 응답 전에는 4단계가 모두 대기다", () => {
    const html = render();

    expect(html.match(/>대기</g)).toHaveLength(4);
    expect(html).not.toContain("sr-only");
  });

  it("제목과 안내, 취소 버튼을 보여 주고 다시 만들기는 없다", () => {
    const html = render({ steps: [...steps] });

    expect(html).toContain("만드는 중이에요");
    expect(html).toContain("요약지 안내를 준비 중이에요.");
    expect(buttonAttributes(html, "취소하고 처음으로")).not.toBeNull();
    expect(html).not.toContain("다시 만들기");
    expect(html).not.toContain('role="alert"');
    expect(html).toContain("animate-spin");
  });

  it("이제 있는 요약지 화면을 두고 '준비 중'이라고 말하지 않는다", () => {
    expect(render()).not.toContain("보기와 수정은 준비 중");
  });

  it("요청 중에는 취소 버튼을 잠근다", () => {
    const html = render({ busy: true });

    expect(buttonAttributes(html, "취소하고 처음으로")).toContain(
      'disabled=""',
    );
  });
});

describe("S06a 다시 만들기 안내", () => {
  it("생성이 실패하면 실패 안내와 다시 만들기, 처음으로 버튼을 보여 준다", () => {
    const html = render({
      phase: "needsRetry",
      reason: "failed",
      steps: [...steps],
    });

    expect(html).toContain("만들지 못했어요");
    expect(html).toContain("요약지를 만드는 중 문제가 생겼어요.");
    expect(html).toContain('role="alert"');
    expect(buttonAttributes(html, "다시 만들기")).not.toBeNull();
    expect(buttonAttributes(html, "취소하고 처음으로")).not.toBeNull();
    expect(html).not.toContain("animate-spin");
    // 멈춘 단계의 "하는 중"이 실패 안내와 부딪치지 않게 단계 목록은 숨긴다.
    expect(html).not.toContain("<ol");
  });

  it("30초가 지나면 시간이 오래 걸린다는 안내를 보여 준다", () => {
    const html = render({ phase: "needsRetry", reason: "timeout" });

    expect(html).toContain("시간이 오래 걸리고 있어요.");
    expect(html).not.toContain("문제가 생겼어요");
    expect(buttonAttributes(html, "다시 만들기")).not.toBeNull();
  });

  it("다시 만들기 요청 중에는 두 버튼을 잠근다", () => {
    const html = render({
      phase: "needsRetry",
      reason: "failed",
      busy: true,
    });

    expect(buttonAttributes(html, "다시 만들기")).toContain('disabled=""');
    expect(buttonAttributes(html, "취소하고 처음으로")).toContain(
      'disabled=""',
    );
  });

  it("처음으로 가는 버튼은 문진을 취소한다는 것을 만드는 중과 같은 라벨로 알린다", () => {
    const polling = render({ steps: [...steps] });
    const stopped = render({ phase: "needsRetry", reason: "failed" });

    expect(buttonAttributes(polling, "취소하고 처음으로")).not.toBeNull();
    expect(buttonAttributes(stopped, "취소하고 처음으로")).not.toBeNull();
    expect(buttonAttributes(stopped, "처음으로")).toBeNull();
  });

  it("버튼이 잠기지 않았을 때는 disabled가 없다", () => {
    const html = render({ phase: "needsRetry", reason: "failed" });

    expect(buttonAttributes(html, "다시 만들기")).not.toContain('disabled=""');
    expect(buttonAttributes(html, "취소하고 처음으로")).not.toContain(
      'disabled=""',
    );
  });
});

describe("S06a 조회 실패와 취소 실패", () => {
  it("조회가 실패하면 서버가 준 문장과 다시 시도 버튼을 보여 준다", () => {
    const html = render({ phase: "error", message: "잠시 후 다시 해 주세요." });

    expect(html).toContain("잠시 후 다시 해 주세요.");
    expect(html).toContain('role="alert"');
    expect(buttonAttributes(html, "다시 시도")).not.toBeNull();
    expect(buttonAttributes(html, "취소하고 처음으로")).not.toBeNull();
    expect(html).not.toContain("animate-spin");
  });

  it("취소가 실패하면 안내를 보여 주고 버튼은 그대로 둔다", () => {
    const html = render({
      phase: "needsRetry",
      reason: "failed",
      cancelMessage: "취소하지 못했어요. 잠시 후 다시 해 주세요.",
    });

    expect(html).toContain("취소하지 못했어요. 잠시 후 다시 해 주세요.");
    expect(buttonAttributes(html, "취소하고 처음으로")).not.toBeNull();
  });
});
