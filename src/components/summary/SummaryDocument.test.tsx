import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SummaryContent } from "@/api/summaries";
import { SummaryDocument } from "@/components/summary/SummaryDocument";
import { sampleSummary } from "@/stores/fixtures";

// 정적 마크업만 확인합니다(저장소에 DOM 테스트 도구가 없습니다).
// S06과 H02(기록 상세)가 같은 컴포넌트를 쓰므로, 기록 상세가 받는 모양(null·[]가 섞인 요약지)으로 확인합니다.
function render(
  summary: SummaryContent,
  large = false,
  caption = "내 기록 · 2026.10.16 저장",
) {
  return renderToStaticMarkup(
    <SummaryDocument summary={summary} caption={caption} large={large} />,
  );
}

// <dt>라벨</dt><dd>값</dd> 쌍을 순서대로 꺼냅니다.
function rowsOf(html: string): [string, string][] {
  return [
    ...html.matchAll(/<dt[^>]*>([^<]*)<\/dt><dd[^>]*>([^<]*)<\/dd>/g),
  ].map((match) => [match[1], match[2]]);
}

describe("요약지 컴포넌트(S06·H02 공용)", () => {
  it("서버 요약지 모양을 행으로 보여 준다", () => {
    expect(rowsOf(render(sampleSummary))).toEqual([
      ["나이대 · 성별", "70대 · 여성"],
      ["주된 증상", "무릎 통증"],
      ["언제부터", "3일 전부터"],
      ["붓기", "있음"],
      ["넘어진 적", "없음"],
      ["복용 중인 약", "혈압약 (매일 아침)"],
      ["앓고 있는 병", "고혈압"],
      ["알레르기", "약 (페니실린)"],
      ["안내된 진료과", "정형외과"],
    ]);
  });

  it("못 물은 항목(null)은 '확인 못 했어요', 없다고 한 항목([])은 '없음'으로 구분한다", () => {
    const summary: SummaryContent = {
      ...sampleSummary,
      medications: null,
      conditions: [],
      allergies: null,
      onsetDetail: null,
    };

    const rows = Object.fromEntries(rowsOf(render(summary)));

    expect(rows["복용 중인 약"]).toBe("확인 못 했어요");
    expect(rows["앓고 있는 병"]).toBe("없음");
    expect(rows["알레르기"]).toBe("확인 못 했어요");
    expect(rows["언제부터"]).toBe("확인 못 했어요");
  });

  it("증상별 항목(items)이 없으면 붓기·넘어진 적 행을 만들지 않는다", () => {
    const labels = rowsOf(render({ ...sampleSummary, items: [] })).map(
      ([label]) => label,
    );

    expect(labels).not.toContain("붓기");
    expect(labels).not.toContain("넘어진 적");
    expect(labels).toHaveLength(7);
  });

  it("호출한 화면이 정한 머리말과 면책 문구를 보여 준다", () => {
    const html = render(sampleSummary);

    expect(html).toContain("내 기록 · 2026.10.16 저장");
    expect(html).toContain("환자가 말한 내용을 정리한 것이며 진단이 아닙니다.");
    expect(render(sampleSummary, false, "AI가 정리한 내용")).toContain(
      "AI가 정리한 내용",
    );
  });

  it("글자 크게 보기를 켜면 큰 글자 크기를 쓴다", () => {
    expect(render(sampleSummary, true)).toContain("text-[1.358rem]");
    expect(render(sampleSummary, false)).not.toContain("text-[1.358rem]");
  });
});
