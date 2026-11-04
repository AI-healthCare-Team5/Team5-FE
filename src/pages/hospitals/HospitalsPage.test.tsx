import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { searchHospitals as mockSearchHospitals } from "@/api/mockApi";
import { HospitalErrorPage } from "@/pages/hospital-error/HospitalErrorPage";
import { HospitalEmptyPage } from "@/pages/hospital-empty/HospitalEmptyPage";
import { HealthCenterCard } from "@/pages/hospital-empty/components/HealthCenterCard";
import { HospitalResults } from "@/pages/hospitals/components/HospitalResults";
import { HospitalsPage } from "@/pages/hospitals/HospitalsPage";
import { LocationPage } from "@/pages/location/LocationPage";
import { getNearestHealthCenter } from "@/api/mockApi";

// 모든 값은 가짜 데이터입니다.
const department = {
  departmentCode: "05",
  departmentName: "정형외과",
  recommendReason: "무릎 통증이 사흘째이고 붓기가 있어 정형외과 진료를 권해요.",
};
const now = new Date("2026-11-04T15:00:00+09:00");

function renderAt(
  element: React.ReactElement,
  entry: string | { pathname: string; state?: unknown } = "/",
) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>{element}</MemoryRouter>,
  );
}

describe("HospitalsPage", () => {
  it("병원을 찾는 동안은 불러오는 중으로 보여 주고 가짜 병원이나 진료과를 그리지 않는다", () => {
    const markup = renderAt(<HospitalsPage />, "/hospitals");

    expect(markup).toContain("병원을 찾는 중이에요");
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain("정형외과");
    expect(markup).not.toContain("의원");
    expect(markup).not.toContain("tel:");
    expect(markup).not.toContain("km");
  });
});

describe("HospitalResults", () => {
  const found = mockSearchHospitals({ regionCode: "51720" }, 10, 3);
  const render = (
    userLocation: { latitude: number; longitude: number } | null,
  ) =>
    renderAt(
      <HospitalResults
        department={department}
        result={found}
        userLocation={userLocation}
        now={now}
      />,
    );

  it("추천 진료과와 이유, 면책 문장을 보여 준다", () => {
    const markup = render(null);

    expect(markup).toContain("추천 진료과");
    expect(markup).toContain("정형외과");
    expect(markup).toContain(department.recommendReason);
    expect(markup).toContain("진단이 아니라 진료과 안내예요.");
  });

  it("병원 목록과 개수, 공공데이터 안내를 보여 준다", () => {
    const markup = render(null);

    expect(markup).toContain("가까운 병원 3곳");
    expect(markup).toContain("OO정형외과의원");
    expect(markup).toContain("△△병원");
    expect(markup).toContain("XX종합병원");
    expect(markup).toContain('href="tel:000-0000-0000"');
    expect(markup).toContain("공공데이터 기준");
    expect(markup).toContain("가기 전에 전화로 진료 여부를 꼭 확인하세요.");
  });

  it("가장 가까운 병원을 선택한 것으로 보여 준다", () => {
    const markup = render({ latitude: 37.697, longitude: 127.889 });
    // 지도의 표시와 별개로, 병원 목록(ol)에서 첫 병원만 눌린 상태여야 합니다.
    const list = markup.match(/<ol[\s\S]*?<\/ol>/)?.[0] ?? "";

    expect(list.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(list.match(/aria-pressed="false"/g)).toHaveLength(2);
    expect(list).toMatch(/aria-pressed="true"[\s\S]*?OO정형외과의원/);
  });

  it("요약지 보기와 처음부터 다시 하기로 이어진다", () => {
    const markup = render(null);

    expect(markup).toContain('href="/summary-loading"');
    expect(markup).toContain("의사에게 보여줄 요약지 보기");
    expect(markup).toContain('href="/"');
    expect(markup).toContain("처음부터 다시 하기");
  });
});

describe("LocationPage", () => {
  it("처음 들어오면 위치를 얻지 못했다는 안내가 없다", () => {
    const markup = renderAt(<LocationPage />, "/location");

    expect(markup).toContain("위치 허용하고 병원 찾기");
    expect(markup).not.toContain("현재 위치를 확인하지 못했어요");
  });

  it("병원 안내에서 위치를 얻지 못해 돌아오면 안내를 보여 준다", () => {
    const markup = renderAt(<LocationPage />, {
      pathname: "/location",
      state: { locationFailed: true },
    });

    expect(markup).toContain("현재 위치를 확인하지 못했어요");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("위치 허용하고 병원 찾기");
  });
});

describe("HospitalEmptyPage", () => {
  it("기본 반경 10km에서 못 찾았으면 30km로 넓혀 찾는 링크를 준다", () => {
    const markup = renderAt(<HospitalEmptyPage />, "/hospital-empty");

    expect(markup).toContain("반경 10km 안에 안내할 병원 정보가 없어요.");
    expect(markup).toContain("범위를 넓혀 다시 찾아볼 수 있어요.");
    expect(markup).toContain('href="/hospitals?radius=30"');
    expect(markup).toContain("30km까지 넓혀서 찾기");
  });

  it("지역으로 찾았다면 넓혀 찾을 때도 그 지역을 이어 간다", () => {
    const markup = renderAt(
      <HospitalEmptyPage />,
      "/hospital-empty?regionCode=51720",
    );

    expect(markup).toContain(
      'href="/hospitals?radius=30&amp;regionCode=51720"',
    );
  });

  it("이미 30km까지 찾았다면 반경을 알리고 넓히는 버튼은 두지 않는다", () => {
    const markup = renderAt(<HospitalEmptyPage />, "/hospital-empty?radius=30");

    expect(markup).toContain("반경 30km 안에 안내할 병원 정보가 없어요.");
    expect(markup).not.toContain("범위를 넓혀");
    expect(markup).not.toContain("넓혀서 찾기");
    expect(markup).toContain("119에 전화하기");
  });

  it("쓸 수 없는 반경은 기본 10km로 본다", () => {
    const markup = renderAt(<HospitalEmptyPage />, "/hospital-empty?radius=99");

    expect(markup).toContain("반경 10km 안에");
  });

  it("보건소를 찾기 전에는 보건소 카드를 그리지 않는다", () => {
    expect(renderAt(<HospitalEmptyPage />, "/hospital-empty")).not.toContain(
      "가까운 보건소",
    );
  });
});

describe("HealthCenterCard", () => {
  const center = getNearestHealthCenter({ regionCode: "51720" }).hospital;
  if (!center) throw new Error("가짜 보건소가 있어야 해요");

  it("이름·주소·거리와 전화 링크를 보여 준다", () => {
    const markup = renderToStaticMarkup(<HealthCenterCard hospital={center} />);

    expect(markup).toContain("가까운 보건소");
    expect(markup).toContain("OO보건소");
    expect(markup).toContain("강원특별자치도 OO시 OO로 00 · 6.3km");
    expect(markup).toContain('href="tel:000-0000-0000"');
    expect(markup).toContain('aria-label="OO보건소 전화"');
  });

  it("전화번호가 없으면 전화 버튼을 두지 않는다", () => {
    const markup = renderToStaticMarkup(
      <HealthCenterCard hospital={{ ...center, phoneNumber: null }} />,
    );

    expect(markup).not.toContain("tel:");
    expect(markup).toContain("OO보건소");
  });
});

describe("HospitalErrorPage", () => {
  it("다시 시도와 요약지 먼저 보기가 눌러 쓸 수 있는 링크다", () => {
    const markup = renderAt(<HospitalErrorPage />, "/hospital-error");

    expect(markup).toContain('href="/hospitals"');
    expect(markup).toContain("다시 시도");
    expect(markup).toContain('href="/summary-loading"');
    expect(markup).toContain("요약지 먼저 보기");
    expect(markup).not.toContain('disabled=""');
    expect(markup).not.toContain("준비 중");
  });

  it("다시 시도는 실패한 검색 조건을 이어 간다", () => {
    const markup = renderAt(
      <HospitalErrorPage />,
      "/hospital-error?radius=30&regionCode=51720",
    );

    expect(markup).toContain(
      'href="/hospitals?radius=30&amp;regionCode=51720"',
    );
  });

  it("119 전화는 그대로 보여 준다", () => {
    expect(renderAt(<HospitalErrorPage />, "/hospital-error")).toContain(
      "119에 전화하기",
    );
  });
});
