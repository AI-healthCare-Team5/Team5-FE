import { useState } from "react";
import { useNavigate } from "react-router";
import { getKakaoAuthorizeUrl, getKakaoRedirectUri } from "@/api/auth";
import { DesignIcon } from "@/components/DesignIcon";
import {
  Illustration,
  NumberedSteps,
  ScreenIcon,
} from "@/components/ScreenElements";
import { ActionLink, Card, Notice, PageTitle } from "@/components/ui";
import { useAppStore } from "@/stores/appStore";
import { saveLoginIntent } from "@/stores/loginIntent";
export function LoginPage({ failed = false }: { failed?: boolean }) {
  const navigate = useNavigate();
  const { returnTo, saveTarget } = useAppStore();
  const [pending, setPending] = useState(false);
  async function login() {
    if (pending) {
      return;
    }
    setPending(true);
    saveLoginIntent({ returnTo, saveTarget });
    try {
      const { authorizeUrl } = await getKakaoAuthorizeUrl(
        getKakaoRedirectUri(),
      );
      window.location.assign(authorizeUrl);
    } catch {
      setPending(false);
      navigate("/login/failed");
    }
  }
  return (
    <>
      <div className="flex flex-col gap-5">
        {failed && (
          <Illustration amber>
            <ScreenIcon name="error" size={44} />
          </Illustration>
        )}
        <PageTitle
          description={
            failed
              ? "카카오 로그인을 취소했거나, 연결이 불안정했어요. 다시 시도하거나, 로그인 없이 계속 쓸 수 있어요."
              : "만든 요약지를 내 기록에 보관하고, 필요할 때 다시 열어 볼 수 있어요."
          }
        >
          {failed ? (
            <>
              로그인을
              <br />
              마치지 못했어요
            </>
          ) : (
            <>
              로그인하면 기록을
              <br />
              모아 볼 수 있어요
            </>
          )}
        </PageTitle>
      </div>
      {failed ? (
        <>
          <div className="flex flex-col gap-3">
            <ActionLink to="/login">다시 시도</ActionLink>
            <ActionLink to="/" variant="outline">
              로그인 없이 계속하기
            </ActionLink>
          </div>
          <Card>
            <h2 className="mb-4 text-[1.111rem] font-bold">이렇게 해 보세요</h2>
            <NumberedSteps
              items={[
                "인터넷 연결을 확인해요",
                "‘다시 시도’를 눌러요",
                "계속 안 되면 로그인 없이 써 보세요. 119 전화는 바로 사용할 수 있어요",
              ]}
            />
          </Card>
        </>
      ) : (
        <>
          <Card>
            <ul className="flex flex-col gap-4">
              {(
                [
                  { icon: "document", text: "요약지를 내 기록에 보관해요" },
                  {
                    icon: "record",
                    text: "문진 내용과 안내받은 진료과를 다시 볼 수 있어요",
                  },
                  {
                    icon: "trash",
                    text: "필요 없는 기록은 직접 지울 수 있어요",
                  },
                ] as const
              ).map(({ icon, text }) => (
                <li key={icon} className="flex items-start gap-[14px]">
                  <span className="grid size-[44px] shrink-0 place-items-center rounded-[14px] bg-brand-soft">
                    <ScreenIcon name={icon} size={24} />
                  </span>
                  <span className="min-w-0">{text}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Notice>
            <span className="flex items-start gap-3">
              <DesignIcon name="info" />
              <span>로그인하지 않아도 119 전화는 바로 사용할 수 있어요.</span>
            </span>
          </Notice>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              aria-label="카카오 로그인"
              aria-busy={pending}
              disabled={pending}
              onClick={login}
              className="flex min-h-[max(44px,3.4rem)] w-full items-center justify-center overflow-hidden rounded-[12px] bg-kakao disabled:cursor-wait disabled:opacity-60"
            >
              <img
                src="/images/kakao-login.svg"
                alt=""
                className="h-auto w-full"
              />
            </button>
            <p className="text-[0.889rem] text-muted">
              닉네임 제공 범위는 정책 확정 후 안내해요. 처음 한 번은 기록
              저장 동의가 필요해요.
            </p>
            <ActionLink to="/" variant="outline">
              로그인 없이 계속하기
            </ActionLink>
          </div>
        </>
      )}
    </>
  );
}
