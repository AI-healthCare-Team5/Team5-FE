import { describe, expect, it } from "vitest";

// 음성은 저장하지 않습니다(이슈 #28, MVP 디자인 결정 8차).
// 녹음 코드가 오디오를 브라우저 저장소에 쓰거나 object URL·data URL로 바꾸지 않는지 소스에서 확인합니다.
const sources = import.meta.glob<string>("./*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

const forbidden = [
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "createObjectURL",
  "FileReader",
  "readAsDataURL",
  "navigator.storage",
  "caches.",
  "document.cookie",
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("녹음 코드는 오디오를 남기지 않는다", () => {
  const productionFiles = Object.entries(sources).filter(
    ([path]) => !path.endsWith(".test.ts") && !path.endsWith("fakeMedia.ts"),
  );

  it("검사할 소스를 찾았다", () => {
    const names = productionFiles.map(([path]) => path);
    expect(names).toEqual(
      expect.arrayContaining(["./recorder.ts", "./controller.ts"]),
    );
  });

  it.each(forbidden)("%s를 쓰지 않는다", (word) => {
    for (const [path, source] of productionFiles) {
      expect(
        stripComments(source),
        `${path}에서 ${word}를 씁니다`,
      ).not.toContain(word);
    }
  });
});
