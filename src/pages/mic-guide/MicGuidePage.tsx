import { DesignIcon } from "@/components/DesignIcon";
import {
  IconList,
  Illustration,
  NumberedSteps,
  ScreenIcon,
} from "@/components/ScreenElements";
import { ActionLink, Card, Notice, PageTitle } from "@/components/ui";

export function MicGuidePage({
  unavailable = false,
}: {
  unavailable?: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-5">
        <Illustration amber={unavailable}>
          <ScreenIcon name={unavailable ? "mic-off" : "mic"} size={44} />
        </Illustration>
        <PageTitle
          description={
            unavailable
              ? "마이크 사용이 허용되지 않았거나, 이 기기에서는 마이크를 지원하지 않아요. 글로 입력해도 병원 안내와 요약지는 똑같이 받을 수 있어요."
              : "말씀하신 내용을 글자로 바꾸려면 마이크가 필요해요. 아래 그림에서 허용 안내를 확인해 주세요."
          }
        >
          {unavailable ? (
            <>
              마이크를
              <br />쓸 수 없어요
            </>
          ) : (
            <>
              마이크를 켜도
              <br />
              될까요?
            </>
          )}
        </PageTitle>
      </div>
      {unavailable ? (
        <>
          <Card>
            <h2 className="mb-4 text-[1.111rem] font-bold">
              마이크를 다시 켜려면
            </h2>
            <NumberedSteps
              items={[
                "주소창 옆의 자물쇠 또는 설정 아이콘을 눌러요",
                "‘마이크’를 ‘허용’으로 바꿔요",
                "이 화면으로 돌아와 ‘마이크 다시 시도’를 눌러요",
              ]}
            />
            <p className="mt-4 text-[0.889rem] text-muted">
              기기와 브라우저에 따라 화면이 조금 달라요.
            </p>
          </Card>
          <Notice>
            <span className="flex items-start gap-3">
              <DesignIcon name="info" />
              <span>
                메신저 같은 앱 안에서 연 화면에서는 마이크가 막혀 있을 수
                있어요. 이때는 글로 입력해 주세요.
              </span>
            </span>
          </Notice>
          <div className="flex flex-col gap-3">
            <ActionLink to="/text-input">
              <ScreenIcon name="write-white" size={24} />
              글로 입력하기
            </ActionLink>
            <ActionLink to="/mic-guide" variant="outline">
              <ScreenIcon name="mic-blue" size={24} />
              마이크 다시 시도
            </ActionLink>
            <ActionLink to="/" variant="quiet">
              처음으로
            </ActionLink>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-[20px] bg-notice px-5 py-[18px]">
            <p className="mb-3 text-[0.889rem] font-medium text-muted">
              이런 창이 화면 위쪽에 나와요 (예시 그림)
            </p>
            <div className="rounded-[16px] border border-line bg-surface p-4 shadow-sm">
              <p className="font-medium">
                이 사이트에서 마이크를 사용하려고 합니다
              </p>
              <div aria-hidden="true" className="mt-3 flex gap-3">
                <span className="flex-1 rounded-full bg-brand py-[10px] text-center font-bold text-white">
                  허용
                </span>
                <span className="flex-1 rounded-full bg-notice py-[10px] text-center font-medium text-notice-ink">
                  차단
                </span>
              </div>
            </div>
          </div>
          <IconList
            items={[
              { icon: "shield", text: "목소리는 저장하지 않아요" },
              {
                icon: "write",
                text: "마이크가 어려우시면 글로 입력하거나 버튼을 눌러 답할 수 있어요",
              },
            ]}
          />
          <div className="flex flex-col gap-3">
            <ActionLink to="/interview">
              <ScreenIcon name="mic-white" />
              마이크 허용하고 시작
            </ActionLink>
            <ActionLink to="/text-input" variant="outline">
              글로 입력할게요
            </ActionLink>
          </div>
        </>
      )}
    </>
  );
}
