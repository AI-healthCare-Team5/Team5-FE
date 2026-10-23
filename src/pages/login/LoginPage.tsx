import { useNavigate } from "react-router";
import { ActionLink, Button, Card, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";

export function LoginPage({ failed = false }: { failed?: boolean }) {
  const navigate = useNavigate();
  const { recordConsent, returnTo } = useAppStore();
  function login() {
    appActions.loginDemo();
    navigate(recordConsent ? returnTo : "/record-consent");
  }
  return (
    <>
      <PageTitle
        description={
          failed
            ? "괜찮아요. 다시 시도하거나 로그인 없이 계속할 수 있어요."
            : "내 진료 기록을 한곳에 모아 두고, 필요할 때 다시 꺼내 볼 수 있어요."
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
      {failed ? (
        <>
          <ActionLink to="/login">다시 시도</ActionLink>
          <ActionLink to="/" variant="outline">
            로그인 없이 계속하기
          </ActionLink>
          <Card>
            <h2 className="font-bold">이렇게 해 보세요</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-[0.889rem] text-muted">
              <li>인터넷 연결을 확인해 주세요.</li>
              <li>카카오 로그인 창을 닫았다면 다시 시도해 주세요.</li>
              <li>
                계속 어렵다면 로그인 없이 병원 안내와 요약지를 이용할 수 있어요.
              </li>
            </ol>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <ul className="space-y-4">
              <li>✓ 만든 진료 요약지를 보관해요.</li>
              <li>✓ 지난 기록을 다시 볼 수 있어요.</li>
              <li>✓ 필요 없는 기록은 지울 수 있어요.</li>
            </ul>
          </Card>
          <button
            type="button"
            aria-label="카카오 로그인"
            onClick={login}
            className="flex min-h-[3.4rem] w-full items-center justify-center overflow-hidden rounded-[12px] bg-[#fee500]"
          >
            <img
              src="/images/kakao-login.svg"
              alt="카카오 로그인"
              className="h-auto w-full"
            />
          </button>
          <p className="text-[0.833rem] text-muted">
            닉네임 제공은 선택이에요. 이메일과 전화번호는 받지 않아요.
          </p>
          <ActionLink to="/" variant="outline">
            로그인 없이 계속하기
          </ActionLink>
          <p className="text-[0.833rem] text-muted">
            로그인하지 않아도 병원 안내와 진료 요약지를 이용할 수 있어요.
          </p>
        </>
      )}
      {failed && (
        <Button variant="quiet" onClick={() => navigate("/")}>
          처음으로
        </Button>
      )}
    </>
  );
}
