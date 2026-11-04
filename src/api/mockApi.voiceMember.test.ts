import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 음성 인식(#28)과 로그인·기록(#29) 가짜 응답을 한 모듈에서 함께 쓸 때 서로 방해하지 않는지 확인합니다.
// 두 PR의 mockApi.ts 변경을 합친 뒤 생긴 회귀 확인입니다. 네트워크는 쓰지 않습니다.
async function loadApis() {
  vi.resetModules();
  vi.stubEnv("VITE_API_MOCK", "true");
  const [intakes, stt, auth, members] = await Promise.all([
    import("@/api/intakes"),
    import("@/api/stt"),
    import("@/api/auth"),
    import("@/api/members"),
  ]);
  return { ...intakes, ...stt, ...auth, ...members };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("가짜 응답에서는 네트워크를 쓰지 않아야 해요");
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("가짜 음성 인식과 가짜 회원", () => {
  const audio = () => new Blob(["가짜"], { type: "audio/webm" });

  it("로그인하지 않아도 음성 인식이 되고, 로그인·로그아웃이 인식 순서를 바꾸지 않는다", async () => {
    const api = await loadApis();

    const first = await api.recognizeSpeech(audio());
    await api.loginWithKakao({
      code: "code",
      state: "state",
      redirectUri: "http://x",
    });
    const second = await api.recognizeSpeech(audio());
    await api.logout();
    const third = await api.recognizeSpeech(audio());

    expect([first.text, second.text, third.text]).toEqual([
      "무릎이 사흘째 아파요",
      "네",
      "아니요",
    ]);
  });

  it("로그아웃하면 말로 시작한 문진은 서버처럼 사라지고, 음성 인식은 계속 된다", async () => {
    const api = await loadApis();
    await api.loginWithKakao({
      code: "code",
      state: "state",
      redirectUri: "http://x",
    });
    const spoken = (await api.recognizeSpeech(audio())).text;
    const started = await api.startIntake({
      inputMode: "VOICE",
      text: spoken,
    });
    await expect(api.getIntake(started.intakeId)).resolves.toBeDefined();

    await api.logout();

    await expect(api.getIntake(started.intakeId)).rejects.toMatchObject({
      code: "INTAKE_404",
    });
    await expect(api.recognizeSpeech(audio())).resolves.toMatchObject({
      text: "네",
    });
  });

  it("탈퇴한 뒤에도 음성 인식이 되고 내 정보는 로그인을 요구한다", async () => {
    const api = await loadApis();
    await api.loginWithKakao({
      code: "code",
      state: "state",
      redirectUri: "http://x",
    });
    await api.getMyInfo();

    await api.withdrawMember();

    await expect(api.getMyInfo()).rejects.toMatchObject({ code: "AUTH_401" });
    await expect(api.recognizeSpeech(audio())).resolves.toMatchObject({
      text: "무릎이 사흘째 아파요",
    });
  });
});
