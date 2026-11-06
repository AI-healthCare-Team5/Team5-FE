import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Guardian } from "@/api/guardians";
import {
  GuardianCard,
  REMOVE_GUARDIAN_CONFIRM_MESSAGE,
} from "@/pages/my-info/components/GuardianCard";
import { GuardianConsentCard } from "@/pages/my-info/components/GuardianConsentCard";

// 모든 값은 가짜 데이터입니다. 내 정보 응답처럼 가운데를 가린 번호입니다.
const guardian: Guardian = {
  relation: "DAUGHTER",
  phoneNumber: "010-****-0000",
};

function renderCard(props: Partial<Parameters<typeof GuardianCard>[0]> = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <GuardianCard
        guardian={guardian}
        busy={false}
        message={null}
        onRemove={() => Promise.resolve(true)}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("GuardianCard", () => {
  it("등록됐으면 관계와 가린 번호, 바꾸기(→ E03)와 지우기를 보여 준다", () => {
    const markup = renderCard();

    expect(markup).toContain("보호자 연락처");
    expect(markup).toContain("딸 · 010-****-0000");
    expect(markup).toMatch(/href="\/guardian"[^>]*>바꾸기</);
    expect(markup).toMatch(/<button[^>]*>지우기</);
    expect(markup).not.toContain("등록하기");
    expect(markup).not.toContain("등록된 연락처가 없어요");
  });

  it("등록하지 않았으면 안내와 등록하기(→ E03)를 보여 주고 바꾸기·지우기는 없다", () => {
    const markup = renderCard({ guardian: null });

    expect(markup).toContain("등록된 연락처가 없어요");
    expect(markup).toMatch(/href="\/guardian"[^>]*>등록하기</);
    expect(markup).not.toContain("바꾸기");
    expect(markup).not.toContain("지우기");
  });

  it("요청 중에는 지우기를 잠그고, 실패 안내를 카드 안에 보여 준다", () => {
    const markup = renderCard({
      busy: true,
      message: "잠시 후 다시 시도해 주세요.",
    });

    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>지우기</);
    expect(markup).toContain("잠시 후 다시 시도해 주세요.");
  });

  it("지우기 확인 문구는 저장 동의도 함께 거두어진다고 알린다", () => {
    expect(REMOVE_GUARDIAN_CONFIRM_MESSAGE).toContain("보호자 연락처");
    expect(REMOVE_GUARDIAN_CONFIRM_MESSAGE).toContain("동의도 함께 거두어져요");
  });
});

describe("GuardianConsentCard", () => {
  it("동의함과 저장 항목, 정해진 저장 위치 문구, 동의 내용 보기를 보여 준다", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <GuardianConsentCard />
      </MemoryRouter>,
    );

    expect(markup).toContain("동의함");
    expect(markup).toContain("보호자 관계, 전화번호");
    expect(markup).toContain(
      "진료한장 서버 DB에 저장하고, 직접 지우거나 탈퇴할 때까지 보관해요",
    );
    expect(markup).toContain('href="/guardian-consent?from=my-info"');
    expect(markup).not.toContain("확정되는 대로");
  });
});
