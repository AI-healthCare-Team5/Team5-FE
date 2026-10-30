import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { getKakaoRedirectUri, loginWithKakao } from "@/api/auth";
import { Spinner } from "@/components/ScreenElements";
import { PageTitle } from "@/components/ui";
import { appActions } from "@/stores/appStore";
import {
  getLoginDestination,
  readLoginIntent,
  takeLoginIntent,
} from "@/stores/loginIntent";

// 인가 코드는 한 번만 쓸 수 있어서, StrictMode에서 effect가 두 번 돌아도 요청은 한 번만 보냅니다.
const pendingLogins = new Map<string, Promise<string>>();

async function finishLogin(code: string, state: string): Promise<string> {
  const intent = takeLoginIntent();
  try {
    const result = await loginWithKakao({
      code,
      state,
      redirectUri: getKakaoRedirectUri(),
    });
    appActions.completeLogin(result, intent);
    return getLoginDestination(intent, result.needsRecordConsent);
  } catch (error) {
    // L01a에서 다시 시도할 때 같은 화면으로 돌아오도록 되돌려 둡니다.
    appActions.prepareLogin(intent.returnTo, intent.saveTarget);
    throw error;
  }
}

function loginOnce(code: string, state: string): Promise<string> {
  let login = pendingLogins.get(code);
  if (!login) {
    login = finishLogin(code, state);
    pendingLogins.set(code, login);
  }
  return login;
}

export function KakaoCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  // 사용자가 카카오 동의 화면에서 취소하면 error=access_denied로 돌아옵니다.
  const canceled = searchParams.has("error");

  useEffect(() => {
    if (canceled || !code || !state) {
      // L01a에서 다시 시도할 때 같은 화면으로 돌아오도록 되돌려 둡니다.
      const intent = readLoginIntent();
      appActions.prepareLogin(intent.returnTo, intent.saveTarget);
      navigate("/login/failed", { replace: true });
      return;
    }
    let active = true;
    loginOnce(code, state)
      .then((destination) => {
        if (active) navigate(destination, { replace: true });
      })
      .catch(() => {
        if (active) navigate("/login/failed", { replace: true });
      });
    return () => {
      active = false;
    };
  }, [code, state, canceled, navigate]);

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-5">
      <Spinner />
      <PageTitle description="잠시만 기다려 주세요.">
        로그인하는 중이에요
      </PageTitle>
    </div>
  );
}
