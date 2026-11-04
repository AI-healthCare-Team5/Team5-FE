// Codex가 apply_patch로 파일을 수정한 뒤 바뀐 파일에만 Prettier를 적용합니다.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as prettier from "prettier";

const patchHeaderPattern =
  /^\*\*\* (Add File|Update File|Move to|Delete File): (.+)$/;

async function readStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8").replace(/^﻿/, "");
}

function findRepoRoot(cwd) {
  try {
    const output = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output.trim() || null;
  } catch {
    return null;
  }
}

// apply_patch 텍스트에서 수정 후에도 남아 있는 파일 경로를 뽑습니다.
// 삭제한 파일은 건너뛰고, 이동한 파일은 도착 경로만 사용합니다.
function extractPatchPaths(patch) {
  const paths = [];
  let lastIndex = -1;

  for (const line of patch.split(/\r?\n/)) {
    const match = patchHeaderPattern.exec(line);

    if (!match) {
      continue;
    }

    const [, kind, filePath] = match;

    if (kind === "Move to") {
      if (lastIndex >= 0) {
        paths[lastIndex] = filePath;
      } else {
        paths.push(filePath);
      }

      lastIndex = -1;
      continue;
    }

    if (kind === "Delete File") {
      lastIndex = -1;
      continue;
    }

    paths.push(filePath);
    lastIndex = kind === "Update File" ? paths.length - 1 : -1;
  }

  return paths;
}

function collectFilePaths(input) {
  const paths = [];
  const command = input.tool_input?.command;
  const filePath = input.tool_input?.file_path;

  if (typeof command === "string") {
    paths.push(...extractPatchPaths(command));
  }

  if (typeof filePath === "string" && filePath) {
    paths.push(filePath);
  }

  return [...new Set(paths)];
}

async function formatFile(repoRoot, baseDir, filePath) {
  const absolutePath = path.resolve(baseDir, filePath);
  const relativePath = path.relative(repoRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return;
  }

  const fileInfo = await prettier.getFileInfo(absolutePath, {
    ignorePath: path.join(repoRoot, ".prettierignore"),
    resolveConfig: true,
  });

  if (fileInfo.ignored || !fileInfo.inferredParser) {
    return;
  }

  let source;

  try {
    source = await readFile(absolutePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  const config = (await prettier.resolveConfig(absolutePath)) ?? {};
  const formatted = await prettier.format(source, {
    ...config,
    filepath: absolutePath,
  });

  if (formatted !== source) {
    await writeFile(absolutePath, formatted, "utf8");
  }
}

async function main() {
  const input = JSON.parse(await readStdin());
  const filePaths = collectFilePaths(input);

  if (filePaths.length === 0) {
    return;
  }

  const baseDir = path.resolve(input.cwd ?? process.cwd());
  const repoRoot = findRepoRoot(baseDir);

  if (!repoRoot) {
    return;
  }

  const failures = [];

  for (const filePath of filePaths) {
    try {
      await formatFile(path.resolve(repoRoot), baseDir, filePath);
    } catch (error) {
      failures.push(`${filePath}: ${error.message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

main().catch((error) => {
  console.error(`Prettier hook 실패: ${error.message}`);
  process.exit(1);
});
