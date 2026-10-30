/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_MAP_APP_KEY?: string;
  // "true"면 백엔드 없이 가짜 API 응답을 씁니다.
  readonly VITE_API_MOCK?: string;
}
