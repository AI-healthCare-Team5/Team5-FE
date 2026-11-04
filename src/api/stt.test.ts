import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/errors";
import { recognizeSpeech } from "@/api/stt";

// 모든 값은 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

function envelope(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify({ message: "", result: null, ...body }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function sentAudio(): File {
  const form = fetchMock.mock.calls[0][1].body;
  expect(form).toBeInstanceOf(FormData);
  return (form as FormData).get("audio") as File;
}

describe("recognizeSpeech", () => {
  it("녹음을 multipart의 audio 부분으로 POST /api/stt에 올리고 인식한 글자를 돌려준다", async () => {
    fetchMock.mockResolvedValue(
      envelope(200, {
        isSuccess: true,
        code: "STT_200",
        result: { text: "무릎이 사흘째 아파요", durationSec: 3.2 },
      }),
    );
    const audio = new Blob(["가짜 녹음"], { type: "audio/webm" });

    const result = await recognizeSpeech(audio);

    expect(result).toEqual({ text: "무릎이 사흘째 아파요", durationSec: 3.2 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/stt");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    // JSON이 아니므로 content-type은 브라우저가 boundary와 함께 채웁니다.
    expect(new Headers(init.headers).has("content-type")).toBe(false);
    expect(Object.keys(Object.fromEntries(init.body as FormData))).toEqual([
      "audio",
    ]);
  });

  it.each([
    ["audio/webm;codecs=opus", "audio/webm", "audio.webm"],
    ["audio/webm", "audio/webm", "audio.webm"],
    ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio.m4a"],
    ["audio/mp4", "audio/mp4", "audio.m4a"],
  ])(
    "%s 녹음은 codecs를 떼고 %s로, 파일 이름은 %s로 올린다",
    async (recorded, type, name) => {
      fetchMock.mockResolvedValue(
        envelope(200, {
          isSuccess: true,
          code: "STT_200",
          result: { text: "네", durationSec: 1 },
        }),
      );

      await recognizeSpeech(new Blob(["가짜"], { type: recorded }));

      const file = sentAudio();
      expect(file.type).toBe(type);
      expect(file.name).toBe(name);
      expect(file.size).toBe(new Blob(["가짜"]).size);
    },
  );

  it("서버가 거절하면 STT code를 담은 ApiError를 던진다", async () => {
    fetchMock.mockResolvedValue(
      envelope(422, {
        isSuccess: false,
        code: "STT_422",
        message: "말씀을 알아듣지 못했어요.",
      }),
    );

    const error = await recognizeSpeech(new Blob(["가짜"])).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "STT_422", status: 422 });
  });

  it("취소 신호를 fetch에 그대로 넘긴다", async () => {
    fetchMock.mockResolvedValue(
      envelope(200, {
        isSuccess: true,
        code: "STT_200",
        result: { text: "네", durationSec: 1 },
      }),
    );
    const controller = new AbortController();

    await recognizeSpeech(new Blob(["가짜"]), controller.signal);

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
