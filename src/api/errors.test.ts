import { describe, expect, it } from "vitest";
import {
  ApiError,
  INVALID_RESPONSE,
  isSessionGone,
  NETWORK_ERROR,
} from "@/api/errors";

describe("isSessionGone", () => {
  it.each([
    ["INTAKE_403", 403],
    ["INTAKE_404", 404],
    ["DEPARTMENT_403", 403],
    ["DEPARTMENT_404", 404],
    ["SUMMARY_403", 403],
    ["SUMMARY_404", 404],
  ])("%s는 더는 쓸 수 없는 문진·진료과·요약지다", (code, status) => {
    expect(isSessionGone(new ApiError(code, "", status))).toBe(true);
  });

  it.each([
    ["INTAKE_400", 400],
    ["INTAKE_409", 409],
    ["INTAKE_503", 503],
    ["DEPARTMENT_409", 409],
    ["SUMMARY_409", 409],
    ["SUMMARY_500", 500],
    ["HOSPITAL_404", 404],
    ["AUTH_401", 401],
    [NETWORK_ERROR, 0],
    [INVALID_RESPONSE, 200],
  ])("%s는 쓸 수 없는 문진·진료과·요약지가 아니다", (code, status) => {
    expect(isSessionGone(new ApiError(code, "", status))).toBe(false);
  });

  it("ApiError가 아닌 값은 쓸 수 없는 문진·진료과·요약지가 아니다", () => {
    expect(isSessionGone(new Error("INTAKE_404"))).toBe(false);
    expect(isSessionGone(null)).toBe(false);
    expect(isSessionGone("SUMMARY_404")).toBe(false);
  });
});
