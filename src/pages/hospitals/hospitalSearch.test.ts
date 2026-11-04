import { describe, expect, it } from "vitest";
import {
  formatTodayHours,
  hospitalOutcomePath,
} from "@/pages/hospitals/hospitalSearch";
import { createSampleHospitalSearch } from "@/pages/hospitals/sampleHospitals";
import type { HospitalToday } from "@/pages/hospitals/types";

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

describe("hospitalOutcomePath", () => {
  it("결과 종류마다 노션 명세의 화면으로 보낸다", () => {
    const result = { radiusKm: 10, dataUpdatedAt: "", hospitals: [] };

    expect(hospitalOutcomePath({ kind: "found", result })).toBeNull();
    expect(hospitalOutcomePath({ kind: "empty", result })).toBe(
      "/hospital-empty",
    );
    expect(hospitalOutcomePath({ kind: "needsRegion" })).toBe("/location");
    expect(hospitalOutcomePath({ kind: "error" })).toBe("/hospital-error");
  });
});

describe("createSampleHospitalSearch", () => {
  it("Figma 예시처럼 마지막 병원이 '진료 종료 · 내일 09:00 시작'으로 보인다", () => {
    const outcome = createSampleHospitalSearch(now);
    if (outcome.kind !== "found") throw new Error(outcome.kind);
    const texts = outcome.result.hospitals.map(
      (hospital) => formatTodayHours(hospital.today, now)?.text,
    );

    expect(texts).toEqual([
      "오늘 18:00까지 진료",
      "오늘 17:30까지 진료",
      "진료 종료 · 내일 09:00 시작",
    ]);
  });
});
