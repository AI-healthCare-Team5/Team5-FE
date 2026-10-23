import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";

const fontSizes = [18, 22, 26] as const;
const fontLabels = ["보통", "크게", "더 크게"];
const hiddenEmergencyBarPaths = new Set([
  "/emergency",
  "/emergency-card",
  "/hospital-empty",
  "/hospital-error",
]);

function readFontSize(): number {
  try {
    const stored = Number(localStorage.getItem("jinryo-font-size"));
    return fontSizes.some((size) => size === stored) ? stored : 18;
  } catch {
    return 18;
  }
}

export function AppShell() {
  const [fontSize, setFontSize] = useState(readFontSize);
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    try {
      localStorage.setItem("jinryo-font-size", String(fontSize));
    } catch {
      // 저장소가 차단되어도 현재 화면에서는 선택한 글자 크기를 유지합니다.
    }
  }, [fontSize]);
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector<HTMLElement>("main h1");
    if (heading) {
      document.title = `${heading.textContent} · 진료한장`;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [pathname]);
  return (
    <div className="md:border-line mx-auto flex min-h-dvh w-full flex-col bg-canvas md:max-w-[480px] md:border-x md:shadow-xl">
      <a href="#main" className="sr-only focus:not-sr-only focus:p-4">
        본문 바로가기
      </a>
      <header className="flex min-h-[88px] flex-wrap items-center justify-between gap-2 px-6 py-4">
        <Link
          to="/"
          aria-label="진료한장 처음으로"
          className="flex min-h-[44px] items-center gap-[8px] text-[16px] font-bold"
        >
          <img src="/favicon.svg" alt="" className="h-[30px] w-[30px]" />
          진료한장
        </Link>
        <fieldset className="min-w-0">
          <legend className="text-muted mb-1 w-full text-right text-[11px]">
            글자 크기
          </legend>
          <div className="flex rounded-[8px] bg-[#edf0f5] p-[3px]">
            {fontSizes.map((size, index) => (
              <button
                key={size}
                type="button"
                aria-label={`글자 크기 ${fontLabels[index]}`}
                aria-pressed={fontSize === size}
                onClick={() => setFontSize(size)}
                className={`h-[44px] w-[44px] rounded-[6px] font-bold ${fontSize === size ? "bg-ink text-white" : "text-ink"}`}
                style={{ fontSize: 13 + index * 3 }}
              >
                가
              </button>
            ))}
          </div>
        </fieldset>
      </header>
      <main id="main" className="flex-1 space-y-6 px-6 pt-4 pb-8">
        <Outlet />
      </main>
      {!hiddenEmergencyBarPaths.has(pathname) && (
        <footer className="bg-emergency-soft text-emergency sticky bottom-0 z-10 mt-auto flex min-h-[69px] items-center justify-between gap-[8px] px-[24px] py-[10px] pb-[calc(10px+env(safe-area-inset-bottom))] text-[16px]">
          <span>위급하면 바로 119</span>
          <a
            className="bg-emergency flex h-[48px] shrink-0 items-center justify-center rounded-[8px] px-[14px] font-bold text-white"
            href="tel:119"
          >
            ☎ 119 전화
          </a>
        </footer>
      )}
    </div>
  );
}
