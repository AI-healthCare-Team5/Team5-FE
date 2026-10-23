import { Link } from "react-router";
import { MicrophoneIcon } from "@/components/MicrophoneIcon";
import { ActionLink, Card, Disclaimer, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";

export function StartPage() {
  const { loggedIn } = useAppStore();
  return (
    <>
      <PageTitle eyebrow="진료를 준비해요!">
        어디가 불편하세요?
        <br />
        말로 편하게 알려주세요
      </PageTitle>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <Link
          to="/mic-guide"
          onClick={appActions.startInterview}
          className="group flex min-h-[44px] flex-col items-center gap-5 text-brand-strong"
        >
          <span className="voice-start grid size-[10rem] place-items-center rounded-full border-[6px] border-[#c7d6fb] bg-brand text-white shadow-[0_0_0_12px_#e8eefb]">
            <MicrophoneIcon size={72} />
          </span>
          <span className="text-[1.222rem] font-bold">말로 시작하기</span>
        </Link>
        <p className="max-w-[18rem] text-[0.889rem] text-muted">
          알맞은 병원을 안내하고, 의사 선생님께 보여줄 요약지를 만들어 드려요.
        </p>
        <Link
          to="/text-input"
          className="flex min-h-[44px] items-center rounded-full border border-control bg-surface px-5 py-2 text-[0.889rem] font-semibold text-brand-strong"
        >
          ♧ 글로 입력하기
        </Link>
      </div>
      <Card>
        <h2 className="mb-3 font-bold">이렇게 말씀해 보세요</h2>
        <ul className="space-y-2 text-[0.889rem] text-muted">
          {[
            "무릎이 사흘째 아파요",
            "기침이 나고 열이 나요",
            "먹는 약이 있는데 어지러워요",
          ].map((text) => (
            <li key={text} className="rounded-[8px] bg-canvas px-3 py-2">
              “{text}”
            </li>
          ))}
        </ul>
      </Card>
      <section className="space-y-4">
        <h2 className="font-bold">이렇게 진행돼요</h2>
        {[
          ["1", "말하기", "어디가 어떻게 아픈지 알려주세요."],
          ["2", "병원 안내", "알려주신 내용으로 가까운 병원을 안내해요."],
          ["3", "요약지", "의사 선생님께 보여줄 내용을 한 장으로 정리해요."],
        ].map(([number, title, text]) => (
          <div key={number} className="flex items-start gap-3">
            <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-ink text-[14px] font-bold text-white">
              {number}
            </span>
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="text-[0.889rem] text-muted">{text}</p>
            </div>
          </div>
        ))}
      </section>
      <p className="rounded-[8px] bg-emergency-soft p-3 text-[0.833rem] text-emergency">
        ⚠ 위급한 증상이 느껴지시면 119에 전화하세요.
      </p>
      <p className="text-[0.833rem] text-muted">♧ 목소리는 저장하지 않아요.</p>
      <ActionLink to="/my-info" variant="outline">
        내 정보 · 보호자 연락처
      </ActionLink>
      <ActionLink to={loggedIn ? "/records" : "/login"} variant="outline">
        {loggedIn ? "내 진료 기록 보기" : "로그인하고 진료 기록 보관하기"}
      </ActionLink>
      <Disclaimer>
        본 서비스는 의료진의 진단을 대신하지 않습니다. 진료를 준비하도록 돕는
        서비스예요.
      </Disclaimer>
    </>
  );
}
