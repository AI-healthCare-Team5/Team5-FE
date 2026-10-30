/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // VITE_ 접두사가 없는 값은 이 설정 파일에서만 읽고 브라우저 번들에는 넣지 않습니다.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // preview.proxy는 기본값으로 이 설정을 함께 씁니다.
      proxy: {
        "/api": {
          target: env.API_ORIGIN || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    test: {
      passWithNoTests: true,
    },
  };
});
