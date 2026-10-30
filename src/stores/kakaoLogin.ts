import { getKakaoRedirectUri, loginWithKakao } from "@/api/auth";
import { appActions } from "@/stores/appStore";
import {
  clearLoginIntent,
  getLoginDestination,
  readLoginIntent,
} from "@/stores/loginIntent";

// 인가 코드는 한 번만 쓸 수 있어서, StrictMode에서 effect가 두 번 돌아도 요청은 한 번만 보냅니다.
const pendingLogins = new Map<string, Promise<string>>();

// 콜백으로 받은 code와 state로 로그인하고, 로그인 후 갈 화면을 돌려줍니다.
// 기억한 내용은 성공한 뒤에만 지워서, 실패 뒤 새로고침하고 다시 시도해도 이어집니다.
async function finishLogin(code: string, state: string): Promise<string> {
  const intent = readLoginIntent();
  const result = await loginWithKakao({
    code,
    state,
    redirectUri: getKakaoRedirectUri(),
  });
  clearLoginIntent();
  appActions.completeLogin(result, intent);
  return getLoginDestination(intent, result.needsRecordConsent);
}

export function loginWithKakaoCallback(
  code: string,
  state: string,
): Promise<string> {
  let login = pendingLogins.get(code);
  if (!login) {
    login = finishLogin(code, state);
    pendingLogins.set(code, login);
  }
  return login;
}
