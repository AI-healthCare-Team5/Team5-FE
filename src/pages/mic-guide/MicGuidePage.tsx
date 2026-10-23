import { MicrophoneIcon } from "@/components/MicrophoneIcon";
import { ActionLink, Card, PageTitle } from "@/components/ui";

export function MicGuidePage({
  unavailable = false,
}: {
  unavailable?: boolean;
}) {
  return (
    <>
      <span className="grid h-[64px] w-[64px] place-items-center rounded-full bg-brand-soft text-brand">
        <MicrophoneIcon />
      </span>
      <PageTitle
        description={
          unavailable
            ? "마이크 권한이 꺼져 있거나, 지금 브라우저에서 마이크를 쓸 수 없어요."
            : "편안하게 내용을 말씀해 주시면 마이크가 목소리를 듣고, 내용을 여쭤볼 수 있게 도와드려요. 부담 없이 눌러 주세요."
        }
      >
        {unavailable ? (
          "마이크를 사용할 수 없어요"
        ) : (
          <>
            마이크를 켜도
            <br />
            될까요?
          </>
        )}
      </PageTitle>
      {unavailable ? (
        <>
          <ActionLink to="/text-input">글로 입력하기</ActionLink>
          <ActionLink to="/mic-guide" variant="outline">
            마이크 다시 시도
          </ActionLink>
          <Card>
            <h2 className="font-bold">이렇게 해 보세요</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-[0.889rem] text-muted">
              <li>브라우저 설정에서 마이크를 허용해 주세요.</li>
              <li>카카오톡 안에서 열었다면 Chrome이나 Safari로 열어 주세요.</li>
              <li>마이크를 쓰기 어려우면 글로 입력해도 괜찮아요.</li>
            </ol>
          </Card>
          <ActionLink to="/" variant="quiet">
            처음으로
          </ActionLink>
        </>
      ) : (
        <>
          <Card>
            <p className="mb-3 text-[0.833rem] text-muted">
              아래와 같은 안내가 나타나면 허용을 눌러 주세요.
            </p>
            <p className="font-semibold">
              이 사이트에서 마이크를 사용하려고 합니다
            </p>
            <div aria-hidden="true" className="mt-3 flex gap-2">
              <span className="flex-1 rounded-full bg-brand px-4 py-2 text-center text-white">
                허용
              </span>
              <span className="flex-1 rounded-full bg-canvas px-4 py-2 text-center">
                차단
              </span>
            </div>
          </Card>
          <ul className="space-y-3 text-[0.889rem] text-muted">
            <li>♧ 목소리는 저장하지 않아요.</li>
            <li>♧ 필요한 내용만 질문할게요.</li>
            <li>
              ♧ 마이크가 켜지지 않으면 글로 입력하거나 다른 브라우저를 쓸 수
              있어요.
            </li>
          </ul>
          <ActionLink to="/interview">마이크 허용하고 시작</ActionLink>
          <ActionLink to="/text-input" variant="outline">
            글로 입력할게요
          </ActionLink>
        </>
      )}
    </>
  );
}
