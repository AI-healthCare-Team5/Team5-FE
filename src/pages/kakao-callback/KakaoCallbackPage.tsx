import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Spinner } from "@/components/ScreenElements";
import { PageTitle } from "@/components/ui";
import { loginWithKakaoCallback } from "@/stores/kakaoLogin";

export function KakaoCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  // 사용자가 카카오 동의 화면에서 취소하면 error=access_denied로 돌아옵니다.
  const canceled = searchParams.has("error");

  useEffect(() => {
    // 기억한 내용은 sessionStorage에 남아 있어서 L01a에서 다시 시도해도 이어집니다.
    if (canceled || !code || !state) {
      navigate("/login/failed", { replace: true });
      return;
    }
    let active = true;
    loginWithKakaoCallback(code, state)
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
