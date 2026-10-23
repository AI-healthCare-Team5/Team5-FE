import { Link } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";
import { appActions, useAppStore } from "@/stores/appStore";

const steps = [
  ["말하기", "AI가 몇 가지를 되물어 확인해요"],
  ["병원 안내", "알맞은 진료과와 가까운 병원을 지도로 보여드려요"],
  ["요약지", "증상·기간·복용약·알레르기를 정리해 의사에게 보여드려요"],
];

export function StartPage() {
  const { loggedIn } = useAppStore();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <p className="text-[0.889rem] font-bold text-brand-strong">
          진료 준비 도우미
        </p>
        <h1 className="text-[1.667rem] leading-[1.35] font-bold tracking-[-0.02em]">
          어디가 불편하세요?
          <br />
          말로 편하게 알려주세요
        </h1>
      </div>
      <div className="flex flex-col items-center gap-5 text-center">
        <Link
          to="/mic-guide"
          onClick={appActions.startInterview}
          className="flex flex-col items-center gap-[9px] rounded-[36px] text-brand-strong"
        >
          <span className="voice-start grid size-[216px] place-items-center rounded-full bg-brand-soft p-[9px]">
            <span className="grid size-full place-items-center rounded-full bg-brand-ring p-[9px]">
              <span className="grid size-full place-items-center rounded-full bg-brand text-white">
                <DesignIcon name="microphone" size={72} />
              </span>
            </span>
          </span>
          <span className="text-[1.222rem] font-bold tracking-[-0.2px]">
            말로 시작하기
          </span>
        </Link>
        <p className="w-full text-muted">
          알맞은 병원을 안내하고, 의사 선생님께 보여줄 요약지를 만들어 드려요.
        </p>
        <Link
          to="/text-input"
          className="flex min-h-[54px] items-center justify-center gap-[10px] rounded-[18px] border border-control bg-surface px-7 py-3 font-bold text-brand-strong"
        >
          <img
            src="/images/start/write.png"
            alt=""
            className="size-[24px] shrink-0"
          />
          글로 입력하기
        </Link>
      </div>
      <section
        aria-labelledby="start-examples"
        className="rounded-[20px] border border-line bg-surface p-5"
      >
        <h2
          id="start-examples"
          className="mb-[15px] text-[0.889rem] font-bold text-muted"
        >
          이렇게 말씀해 보세요
        </h2>
        <ul className="flex flex-col gap-[10px]">
          {[
            "무릎이 사흘째 아파요",
            "배가 아프고 열이 나요",
            "약을 먹었는데 어지러워요",
          ].map((text) => (
            <li key={text} className="rounded-[14px] bg-brand-subtle px-4 py-3">
              “{text}”
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="start-steps" className="flex flex-col gap-4">
        <h2
          id="start-steps"
          className="text-[1.222rem] font-bold tracking-[-0.2px]"
        >
          이렇게 진행돼요
        </h2>
        <ol className="flex flex-col gap-4">
          {steps.map(([title, text], index) => (
            <li key={title} className="flex items-start gap-[14px]">
              <span
                aria-hidden="true"
                className="grid size-[36px] shrink-0 place-items-center rounded-full bg-ink text-[16px] font-bold text-white"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-bold">{title}</h3>
                <p className="text-[0.889rem] text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className="flex flex-col gap-[10px]">
        <p className="flex items-start gap-3 rounded-[14px] bg-emergency-soft px-4 py-[14px] text-[0.889rem] text-emergency-ink">
          <img
            src="/images/start/warning.png"
            alt=""
            className="size-[22px] shrink-0"
          />
          <span>위험한 증상이 느껴지면 바로 119 안내로 넘어가요.</span>
        </p>
        <p className="flex items-start gap-3 rounded-[14px] bg-notice px-4 py-[14px] text-[0.889rem] text-notice-ink">
          <img
            src="/images/start/privacy.png"
            alt=""
            className="size-[22px] shrink-0"
          />
          <span>목소리는 저장하지 않아요.</span>
        </p>
        <Link
          to={loggedIn ? "/records" : "/login"}
          className="flex min-h-[74px] items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-[15px] text-[0.889rem] font-bold text-brand-strong"
        >
          <img
            src="/images/start/account.png"
            alt=""
            className="size-[22px] shrink-0"
          />
          <span className="min-w-0 flex-1">
            {loggedIn ? "내 진료 기록 보기" : "로그인하고 진료 기록 보관하기"}
          </span>
          <DesignIcon name="chevron" size={20} />
        </Link>
        <Link
          to="/my-info"
          className="flex min-h-[81px] items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-[15px] text-[0.889rem] font-bold text-brand-strong"
        >
          <DesignIcon name="phone" />
          <span className="min-w-0 flex-1">
            내 정보 · 보호자 연락처를 미리
            <br />
            등록해 두세요
          </span>
          <DesignIcon name="chevron" size={20} />
        </Link>
      </div>
      <p className="flex items-start gap-[10px] text-[0.889rem] leading-[1.5] text-muted">
        <DesignIcon name="info" size={20} />
        <span>
          본 서비스는 의료진의 진단을 대신하지 않습니다. 진료를 준비하도록 돕는
          서비스예요.
        </span>
      </p>
    </div>
  );
}
