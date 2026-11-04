import { describe, expect, it } from "vitest";
import type { HospitalToday } from "@/api/hospitals";
import {
  effectiveRadius,
  formatTodayHours,
  isLocationFailed,
  locationFailedState,
  parseHospitalQuery,
  withHospitalQuery,
} from "@/pages/hospitals/hospitalSearch";

// 한국 시간 2026-11-04(수) 15:00입니다.
const now = new Date("2026-11-04T15:00:00+09:00");

const closed: HospitalToday = {
  isOpen: false,
  is24Hours: false,
  openTime: null,
  closeTime: null,
  nextOpenAt: null,
};

describe("formatTodayHours", () => {
  it("진료 중이면 오늘 마감 시각을 보여 준다", () => {
    expect(
      formatTodayHours(
        {
          isOpen: true,
          is24Hours: false,
          openTime: "09:00",
          closeTime: "18:00",
          nextOpenAt: null,
        },
        now,
      ),
    ).toEqual({ open: true, text: "오늘 18:00까지 진료" });
  });

  it("24시간 진료면 마감 시각 대신 24시간 진료로 보여 준다", () => {
    expect(
      formatTodayHours(
        {
          isOpen: true,
          is24Hours: true,
          openTime: "00:00",
          closeTime: "23:59",
          nextOpenAt: null,
        },
        now,
      ),
    ).toEqual({ open: true, text: "24시간 진료" });
  });

  it("진료가 끝났으면 다음 진료 시작을 내일·날짜로 보여 준다", () => {
    expect(
      formatTodayHours(
        { ...closed, nextOpenAt: "2026-11-05T09:00:00+09:00" },
        now,
      ),
    ).toEqual({ open: false, text: "진료 종료 · 내일 09:00 시작" });
    expect(
      formatTodayHours(
        { ...closed, nextOpenAt: "2026-11-09T08:30:00+09:00" },
        now,
      ),
    ).toEqual({ open: false, text: "진료 종료 · 11월 9일 08:30 시작" });
  });

  it("아직 문을 열기 전이면 진료 종료 없이 오늘 시작 시각을 보여 준다", () => {
    expect(
      formatTodayHours(
        { ...closed, nextOpenAt: "2026-11-04T09:00:00+09:00" },
        new Date("2026-11-04T07:30:00+09:00"),
      ),
    ).toEqual({ open: false, text: "오늘 09:00 시작" });
  });

  it("한국 날짜 기준으로 오늘·내일을 정한다(자정 직전)", () => {
    expect(
      formatTodayHours(
        { ...closed, nextOpenAt: "2026-11-05T09:00:00+09:00" },
        new Date("2026-11-04T14:59:00Z"),
      ),
    ).toEqual({ open: false, text: "진료 종료 · 내일 09:00 시작" });
  });

  it("다음 진료 시각이 없으면 진료 종료만, 진료 시간 정보가 없으면 null이다", () => {
    expect(formatTodayHours(closed, now)).toEqual({
      open: false,
      text: "진료 종료",
    });
    expect(formatTodayHours(null, now)).toBeNull();
  });
});

describe("parseHospitalQuery", () => {
  const parse = (search: string) =>
    parseHospitalQuery(new URLSearchParams(search));

  it("주소가 비어 있으면 아무 조건도 없다", () => {
    expect(parse("")).toEqual({});
  });

  it("1~30 사이 정수 radius와 지역 코드를 읽는다", () => {
    expect(parse("radius=30")).toEqual({ radius: 30 });
    expect(parse("radius=1&regionCode=51720")).toEqual({
      radius: 1,
      regionCode: "51720",
    });
    expect(parse("regionCode=%2051720%20")).toEqual({ regionCode: "51720" });
  });

  it.each(["0", "31", "99", "-1", "2.5", "10km", "abc", "", " 5", "1e1"])(
    "radius=%s는 쓸 수 없는 값이라 기본값을 쓴다",
    (value) => {
      expect(parse(`radius=${encodeURIComponent(value)}`)).toEqual({});
    },
  );

  it("빈 지역 코드는 없는 것으로 본다", () => {
    expect(parse("regionCode=")).toEqual({});
    expect(parse("regionCode=%20%20")).toEqual({});
  });
});

describe("withHospitalQuery", () => {
  it("조건이 없으면 경로만, 있으면 주소에 붙인다", () => {
    expect(withHospitalQuery("/hospital-empty", {})).toBe("/hospital-empty");
    expect(withHospitalQuery("/hospitals", { radius: 30 })).toBe(
      "/hospitals?radius=30",
    );
    expect(
      withHospitalQuery("/hospitals", { radius: 30, regionCode: "51720" }),
    ).toBe("/hospitals?radius=30&regionCode=51720");
  });

  it("읽은 조건을 다시 붙이면 같은 조건이 된다", () => {
    const query = { radius: 10, regionCode: "51 20" };
    const url = withHospitalQuery("/hospitals", query);

    expect(parseHospitalQuery(new URLSearchParams(url.split("?")[1]))).toEqual(
      query,
    );
  });
});

describe("effectiveRadius", () => {
  it("생략하면 기본 10km, 있으면 그 값이다", () => {
    expect(effectiveRadius({})).toBe(10);
    expect(effectiveRadius({ radius: 30 })).toBe(30);
    expect(effectiveRadius({ regionCode: "51720" })).toBe(10);
  });
});

describe("isLocationFailed", () => {
  it("위치를 얻지 못했다고 넘긴 값만 true다", () => {
    expect(isLocationFailed(locationFailedState)).toBe(true);
    expect(isLocationFailed({ locationFailed: true })).toBe(true);
  });

  it.each([
    null,
    undefined,
    {},
    { locationFailed: false },
    "locationFailed",
    1,
  ])("%j는 false다", (value) => {
    expect(isLocationFailed(value)).toBe(false);
  });
});
