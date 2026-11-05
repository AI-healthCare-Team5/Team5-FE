import { describe, expect, it } from "vitest";
import {
  isAcceptedAudioType,
  pickRecorderMimeType,
  toBaseMimeType,
} from "@/lib/voice/mimeType";

describe("pickRecorderMimeType", () => {
  const supports =
    (...types: string[]) =>
    (type: string) =>
      types.includes(type);

  it("webm(opus)와 mp4를 모두 지원하면 webm(opus)을 고른다", () => {
    expect(
      pickRecorderMimeType(supports("audio/mp4", "audio/webm;codecs=opus")),
    ).toBe("audio/webm;codecs=opus");
  });

  it("codecs 없는 webm만 지원하면 그것을 고른다", () => {
    expect(pickRecorderMimeType(supports("audio/webm"))).toBe("audio/webm");
  });

  it("사파리처럼 mp4만 지원하면 mp4를 고른다", () => {
    expect(pickRecorderMimeType(supports("audio/mp4"))).toBe("audio/mp4");
    expect(
      pickRecorderMimeType(supports("audio/mp4;codecs=mp4a.40.2", "audio/mp4")),
    ).toBe("audio/mp4;codecs=mp4a.40.2");
  });

  it("서버가 받는 형식이 하나도 없으면 undefined다", () => {
    expect(
      pickRecorderMimeType(supports("audio/ogg;codecs=opus", "audio/wav")),
    ).toBeUndefined();
  });
});

describe("isAcceptedAudioType", () => {
  it("webm과 mp4는 codecs 파라미터와 대소문자에 관계없이 받는다", () => {
    expect(toBaseMimeType(" Audio/WebM ; codecs=opus")).toBe("audio/webm");
    expect(isAcceptedAudioType("audio/webm;codecs=opus")).toBe(true);
    expect(isAcceptedAudioType("audio/webm")).toBe(true);
    expect(isAcceptedAudioType("audio/mp4")).toBe(true);
    expect(isAcceptedAudioType("Audio/MP4;codecs=mp4a.40.2")).toBe(true);
  });

  it("ogg·wav·빈 값은 받지 않는다", () => {
    expect(isAcceptedAudioType("audio/ogg;codecs=opus")).toBe(false);
    expect(isAcceptedAudioType("audio/wav")).toBe(false);
    expect(isAcceptedAudioType("video/webm")).toBe(false);
    expect(isAcceptedAudioType("")).toBe(false);
  });
});
