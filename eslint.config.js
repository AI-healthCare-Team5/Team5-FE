import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import { reactRefresh } from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// 색과 글자 크기는 src/styles/theme.css의 토큰과 rem을 씁니다.
// 설계상 px 고정인 곳(헤더 글자 크기 컨트롤, 119 바)은 줄 단위로 예외 처리하고 이유를 남깁니다.
const hexColorMessage =
  "색은 hex 값 대신 src/styles/theme.css의 토큰(예: bg-brand-soft, border-emergency-line)을 쓰세요.";
const pxFontSizeMessage =
  "글자 크기는 rem으로 지정해야 글자 크기 3단계에 맞춰 커집니다. px 고정이 설계에 있는 곳만 예외로 둡니다.";
const designTokenRules = [
  {
    selector: "Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]|^#[0-9a-fA-F]{3,8}$/]",
    message: hexColorMessage,
  },
  {
    selector:
      "TemplateElement[value.raw=/\\[#[0-9a-fA-F]{3,8}\\]|^#[0-9a-fA-F]{3,8}$/]",
    message: hexColorMessage,
  },
  {
    selector: "Literal[value=/text-\\[[0-9.]+px\\]/]",
    message: pxFontSizeMessage,
  },
  {
    selector: "TemplateElement[value.raw=/text-\\[[0-9.]+px\\]/]",
    message: pxFontSizeMessage,
  },
];

export default defineConfig(
  globalIgnores(["dist", "node_modules", ".wrangler"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "no-restricted-syntax": ["error", ...designTokenRules],
    },
  },
  {
    files: ["src/**/*.tsx"],
    extends: [reactRefresh.configs.vite(), jsxA11y.configs.recommended],
  },
  {
    files: ["worker/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    files: ["*.{js,ts}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
);
